import * as Chess from 'chess.js';
import {
	addMedia
} from '../utils/media-utils';
import {
	getAbsoluteHref
} from '../utils/media-url-utils';
import rookB from '../assets/models/chess/black_rook.glb';
import knightB from '../assets/models/chess/black_knight.glb';
import bishopB from '../assets/models/chess/black_bishop.glb';
import queenB from '../assets/models/chess/black_queen.glb';
import kingB from '../assets/models/chess/black_king.glb';
import pawnB from '../assets/models/chess/black_pawn.glb';
import rookW from '../assets/models/chess/white_rook.glb';
import knightW from '../assets/models/chess/white_knight.glb';
import bishopW from '../assets/models/chess/white_bishop.glb';
import queenW from '../assets/models/chess/white_queen.glb';
import kingW from '../assets/models/chess/white_king.glb';
import pawnW from '../assets/models/chess/white_pawn.glb';

window.AFRAME.registerComponent('chess-board', {
	schema: {
		// defaults
		squareSize: {
			default: 0.25
		},
		snapToSquare: {
			default: true
		},
		preventThrowing: {
			default: true
		},
		invertKnights: {
			default: true
		},
		scaleDefault: {
			default: 2
		},
		yCorrections: {
			default: '0 0 0 0 0 0' // k q b n r p
		},
		drawBoard: {
			default: true
		},
		wireframeBoard: {
			default: false
		},
		teleportPlayers: {
			default: false
		}
	},
	init: function () {
		this.state = this.el.sceneEl.systems.state.state;
		this.tick = AFRAME.utils.throttleTick(this.tick, 300, this);
		this.pieceEls = [];
		this.startGame = this.startGame.bind(this);
		this.buildBoard = this.buildBoard.bind(this);
		this.getRankFromPosition = this.getRankFromPosition.bind(this);
		this.getFileFromPosition = this.getFileFromPosition.bind(this);
		this.getPositionFromRank = this.getPositionFromRank.bind(this);
		this.getPositionFromFile = this.getPositionFromFile.bind(this);
		this.getSquareFromPosition = this.getSquareFromPosition.bind(this);
		this.snapPiece = this.snapPiece.bind(this);
		this.normalizeCoordinate = this.normalizeCoordinate.bind(this);
		this.denormalizeCoordinate = this.denormalizeCoordinate.bind(this);
		this.interactionHandler = this.interactionHandler.bind(this);
		this.moveTo = this.moveTo.bind(this);
		this.onPieceHeld = this.onPieceHeld.bind(this);
		this.onPieceGoBack = this.onPieceGoBack.bind(this);
		this.onPieceDropped = this.onPieceDropped.bind(this);
		this.populateMoves = this.populateMoves.bind(this);
		this.resetPieceRotation = this.resetPieceRotation.bind(this);
		this.getPieceFromSquare = this.getPieceFromSquare.bind(this);
		this.squareCaptured = this.squareCaptured.bind(this);
		this.destroyAllPieces = this.destroyAllPieces.bind(this);
		this.playColor = this.playColor.bind(this);
		this.teleportPlayer = this.teleportPlayer.bind(this);
		this.resetGame = this.resetGame.bind(this);
		this.setPieceClaimed = this.setPieceClaimed.bind(this);
		this.squarePromoted = this.squarePromoted.bind(this);
		this.buildPiece = this.buildPiece.bind(this);
		this.doMove = this.doMove.bind(this);

		// Hubs Chat Commands
		this.el.sceneEl.addEventListener('chess-command', (ev) => {
			const command = ev.detail[0];
			const id = NAF.clientId;
			const profile = window.APP.store.state.profile;
			switch(command) {
				case 'play':
					const color = ev.detail[1];
					this.playColor(color, id, profile);
				break;
				case 'reset':
					this.resetGame();
				break;
				case 'w':
					this.playColor('white', id, profile);
				break;
				case 'b':
					this.playColor('black', id, profile);
				break;
			}
		});
		NAF.connection.onConnect(() => {
			// Networked State Broadcasts
			NAF.connection.subscribeToDataChannel('setPlayer', (_, dataType, data) => {
				this.el.sceneEl.emit('setPlayer', data);
				if (this.state.imPlaying && this.state.opponentColor === data.color) {
					this.state.opponentId = data.id;
				}
				if (data.pieces && data.id !== NAF.clientId) {
					for (const p of data.pieces) {
						this.setPieceClaimed(p);
					}
				}
			});
			NAF.connection.subscribeToDataChannel('addPiece', (_, dataType, data) => {
				this.el.sceneEl.emit('addPiece', data);
				this.setPieceClaimed(data);
			});
			NAF.connection.subscribeToDataChannel('updatePiece', (_, dataType, data) => {
				this.el.sceneEl.emit('updatePiece', data);
			});
			NAF.connection.subscribeToDataChannel('removePiece', (_, dataType, oldPiece) => {
				this.el.sceneEl.emit('removePiece', oldPiece);
			});
			NAF.connection.subscribeToDataChannel('resetChessState', () => {
				this.el.sceneEl.emit('resetChessState');
				this.el.chess = new Chess();
			});
			// Chess Engine Broadcasts
			NAF.connection.subscribeToDataChannel('sync-move', (_, dataType, data) => {
				this.el.chess.move(data);
			});
			NAF.connection.subscribeToDataChannel('capture-piece', (_, dataType, data) => {
				if (this.state.imPlaying) {
					const piece = this.getPieceFromSquare(data.square);
					piece.parentNode.removeChild(piece);
					this.el.sceneEl.emit('removePiece', { id: piece.id, color: piece.pieceData.color });
					NAF.connection.broadcastData('removePiece', { id: piece.id, color: piece.pieceData.color });
				}
			});
		});
	},
	setPieceClaimed(pieceData) {
		// TODO: Retries may no longer be needed with new state system.
		if (!pieceData.retryCount) {
			pieceData.retryCount = 1;
		}
		let piece = document.querySelector(`#${pieceData.id}`);
		if (piece) {
			piece.setAttribute('listed-media', '', true);
			piece.removeAttribute('listed-media');
			piece.classList.remove('interactable');
		} else if (pieceData.retryCount < 5) {
			setTimeout(() => {
				pieceData.retryCount += 1;
				this.setPieceClaimed(pieceData);
			}, 1000);
		}
	},
	resetGame() {
		this.destroyAllPieces();
		this.startGame();
	},
	destroyAllPieces() {
		const pieces = this.state.players.white.pieces.concat(this.state.players.black.pieces);
		for (let i = 0; i < pieces.length; i++) {
			const pieceEl = document.querySelector(`#${pieces[i].id}`);
			if (pieceEl) {
				NAF.utils.takeOwnership(pieceEl);
				pieceEl.parentNode.removeChild(pieceEl);
			}
		}
	},
	playColor(color, id, profile) {
		const colorAvailable = !this.state.players[color].id;
		if (colorAvailable) {
			this.el.sceneEl.emit('imPlaying', { color, id, profile });
			NAF.connection.broadcastData('setPlayer', { color, id, profile });
			this.buildSet(color);
			this.teleportPlayer(color);
			// When new players connect, send them information on current players directly.
			document.body.addEventListener('clientConnected', (ev) => {
				const playerData = {
					id: NAF.clientId,
					profile: window.APP.store.state.profile,
					color: color,
					pieces: this.state.players[color].pieces
				};
				NAF.connection.sendData(ev.detail.clientId, 'setPlayer', playerData);
			});
		}
	},
	teleportPlayer(color) {
		if (this.data.teleportPlayers) {
			this.el.sceneEl.systems['hubs-systems'].characterController.enableFly(true);
			if (color === 'white') {
				const destinationX = this.getPositionFromFile('e') - (this.data.squareSize / 2);
				const destinationY = this.data.squareSize * 4;
				const destinationZ = this.getPositionFromRank('4') + (this.data.squareSize * 5);
				document.querySelector('#avatar-rig').removeAttribute('offset-relative-to');
				document.querySelector('#avatar-rig').setAttribute('offset-relative-to', {
					target: this.el,
					offset: { x: destinationX, y: destinationY, z: destinationZ }
				  });
				// TODO: Replace with teleport waypoint
				const q = new THREE.Quaternion(-0.3046977306369239, 0.06475573883689406, 0.02076899796372855, 0.9500182292756172);
				document.querySelector('#avatar-pov-node').object3D.setRotationFromQuaternion(q);
			} else if (color === 'black') {
				const destinationX = this.getPositionFromFile('e') - (this.data.squareSize / 2);
				const destinationY = this.data.squareSize * 4;
				const destinationZ = this.getPositionFromRank('8') - (this.data.squareSize * 4);
				document.querySelector('#avatar-rig').removeAttribute('offset-relative-to');
				document.querySelector('#avatar-rig').setAttribute('offset-relative-to', {
					target: this.el,
					offset: { x: destinationX, y: destinationY, z: destinationZ }
				  });
				// TODO: Replace with teleport waypoint
				const q = new THREE.Quaternion(-0.007975245041697407, 0.9725746384887974, 0.229994800204803, 0.033724767066099344);
				document.querySelector('#avatar-pov-node').object3D.setRotationFromQuaternion(q);
			}
		}
	},
	startGame: function() {
		this.el.chess = new Chess();
		this.el.sceneEl.emit('resetChessState');
		if (NAF.connection.isConnected()) {
			NAF.connection.broadcastData('resetChessState', {});
		}
	},
	update: function () {
		while(this.el.firstChild) {
			this.el.removeChild(this.el.firstChild);
		}
		const yCorrections = this.data.yCorrections.split(' ');
		this.yCorrections = {
			k: parseFloat(yCorrections[0]),
			q: parseFloat(yCorrections[1]),
			b: parseFloat(yCorrections[2]),
			n: parseFloat(yCorrections[3]),
			r: parseFloat(yCorrections[4]),
			p: parseFloat(yCorrections[5])
		}
		if (this.data.drawBoard) {
			this.buildBoard();
		}
		this.startGame();
	},
	remove: function () {},
	buildBoard: function() {
		var offset = 0;
		this.el.pieceY = this.data.squareSize * 2.4;
		const ranks = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		for (var i = 0, ranksLen = ranks.length; i < ranksLen; i++) {
			var altColor = false;
			if (i % 2 !== 0) {
				altColor = true;
			}
			var rankTemp = this.buildRank(ranks[i], offset, altColor);
			this.el.appendChild(rankTemp);
			offset = offset + parseFloat(this.data.squareSize);
		}		
	},
	buildRank: function (rank, offset, altColor) {
		offset = offset || 0;
		var files = [1, 2, 3, 4, 5, 6, 7, 8];
		var z = 0;
		var rankContainer = window.document.createElement('a-entity');
		rankContainer.setAttribute('id', rank);
		for (var i = 0, filesLen = files.length; i < filesLen; i++) {
			var box = window.document.createElement('a-box');
			var position = offset + ' ' + this.data.squareSize + ' ' + z;
			box.setAttribute('position', position);
			box.setAttribute('height', this.data.squareSize);
			box.setAttribute('width', this.data.squareSize);
			box.setAttribute('depth', this.data.squareSize);
			if (this.data.wireframeBoard) {
				box.setAttribute('wireframe', 'true');
			} else if (altColor) {
				box.setAttribute('color', (i % 2 === 0) ? 'black' : 'white');
			} else {
				box.setAttribute('color', (i % 2 === 0) ? 'white' : 'black');
			}
			box.setAttribute('square', rank + (i + 1));
			box.setAttribute('rank', rank);
			box.setAttribute('file', (i + 1));
			rankContainer.appendChild(box);
			z = z + parseFloat(this.data.squareSize);
		}
		return rankContainer;
	},
	buildSet: function (mode = 'all') {
		let pieces = [];
		if (mode === 'white') {
			pieces = [
				{type: 'r', color: 'w', initialSquare: 'a1', model: rookW},
				{type: 'n', color: 'w', initialSquare: 'b1', model: knightW},
				{type: 'b', color: 'w', initialSquare: 'c1', model: bishopW},
				{type: 'q', color: 'w', initialSquare: 'd1', model: queenW},
				{type: 'k', color: 'w', initialSquare: 'e1', model: kingW},
				{type: 'b', color: 'w', initialSquare: 'f1', model: bishopW},
				{type: 'n', color: 'w', initialSquare: 'g1', model: knightW},
				{type: 'r', color: 'w', initialSquare: 'h1', model: rookW},
				{type: 'p', color: 'w', initialSquare: 'a2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'b2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'c2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'd2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'e2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'f2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'g2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'h2', model: pawnW},
			];
		} else if (mode === 'black') {
			pieces = [
				{type: 'r', color: 'b', initialSquare: 'a8', model: rookB},
				{type: 'n', color: 'b', initialSquare: 'b8', model: knightB},
				{type: 'b', color: 'b', initialSquare: 'c8', model: bishopB},
				{type: 'q', color: 'b', initialSquare: 'd8', model: queenB},
				{type: 'k', color: 'b', initialSquare: 'e8', model: kingB},
				{type: 'b', color: 'b', initialSquare: 'f8', model: bishopB},
				{type: 'n', color: 'b', initialSquare: 'g8', model: knightB},
				{type: 'r', color: 'b', initialSquare: 'h8', model: rookB},
				{type: 'p', color: 'b', initialSquare: 'a7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'b7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'c7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'd7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'e7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'f7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'g7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'h7', model: pawnB},
			];
		} else if (mode === 'all') {
			pieces = [
				{type: 'r', color: 'w', initialSquare: 'a1', model: rookW},
				{type: 'n', color: 'w', initialSquare: 'b1', model: knightW},
				{type: 'b', color: 'w', initialSquare: 'c1', model: bishopW},
				{type: 'q', color: 'w', initialSquare: 'd1', model: queenW},
				{type: 'k', color: 'w', initialSquare: 'e1', model: kingW},
				{type: 'b', color: 'w', initialSquare: 'f1', model: bishopW},
				{type: 'n', color: 'w', initialSquare: 'g1', model: knightW},
				{type: 'r', color: 'w', initialSquare: 'h1', model: rookW},
				{type: 'p', color: 'w', initialSquare: 'a2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'b2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'c2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'd2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'e2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'f2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'g2', model: pawnW},
				{type: 'p', color: 'w', initialSquare: 'h2', model: pawnW},
				{type: 'r', color: 'b', initialSquare: 'a8', model: rookB},
				{type: 'n', color: 'b', initialSquare: 'b8', model: knightB},
				{type: 'b', color: 'b', initialSquare: 'c8', model: bishopB},
				{type: 'q', color: 'b', initialSquare: 'd8', model: queenB},
				{type: 'k', color: 'b', initialSquare: 'e8', model: kingB},
				{type: 'b', color: 'b', initialSquare: 'f8', model: bishopB},
				{type: 'n', color: 'b', initialSquare: 'g8', model: knightB},
				{type: 'r', color: 'b', initialSquare: 'h8', model: rookB},
				{type: 'p', color: 'b', initialSquare: 'a7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'b7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'c7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'd7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'e7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'f7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'g7', model: pawnB},
				{type: 'p', color: 'b', initialSquare: 'h7', model: pawnB},
			];
		} else {
			return false;
		}
		pieces.forEach(piece => {
			this.buildPiece(piece)
		});
		this.cursor = document.createElement('a-sphere');
		this.cursor.setAttribute('radius', this.data.squareSize / 8);
		this.el.appendChild(this.cursor);
	},
	buildPiece(piece) {
		const contentOrigin = 1;
		const src = getAbsoluteHref(location.href, piece.model)
		const {
			entity,
			orientation
		} = addMedia(
			src,
			'#interactable-media',
			contentOrigin,
			null,
			!(src instanceof MediaStream),
			false,
			true, {},
			true,
			this.el
		)
		let pieceScale = this.data.squareSize / this.data.scaleDefault;
		entity.setAttribute('scale', `${pieceScale} ${pieceScale} ${pieceScale}`);
		const file = (piece.hasOwnProperty('sendTo')) ? piece.sendTo.substr(0, 1) : piece.initialSquare.substr(0, 1);
		const rank = (piece.hasOwnProperty('sendTo')) ? piece.sendTo.substr(1, 1) : piece.initialSquare.substr(1, 1);
		const pieceX = this.getPositionFromFile(file);
		const pieceZ = this.getPositionFromRank(rank);
		entity.pieceData = {
			color: piece.color,
			type: piece.type,
			initialSquare: piece.initialSquare,
			lastSquare: (piece.hasOwnProperty('sendTo')) ? piece.sendTo : piece.initialSquare,
			lastPosition: entity.getAttribute('position'),
			currentPosition: entity.getAttribute('position'),
			moves: [],
			wasHeld: false,
			pieceY: this.el.pieceY + this.yCorrections[piece.type]
		};
		const initialPosition = `${pieceX} ${entity.pieceData.pieceY} ${pieceZ}`;
		entity.setAttribute('position', initialPosition);
		this.resetPieceRotation(entity);
		entity.setAttribute('listed-media', '', true);
		entity.removeAttribute('listed-media');
		entity.setAttribute('scalable-when-grabbed', '', true);
		entity.removeAttribute('scalable-when-grabbed');
		entity.setAttribute('hoverable-visuals', '', true);
		entity.removeAttribute('hoverable-visuals');
		this.pieceEls.push(entity);
		setTimeout(() => {
			// Temporary hack to remove pin/clone/delete/etc freeze menu
			entity.firstChild.setAttribute('visible', 'false');
		}, 5000);
		setTimeout(() => {
			const newPiece = {color: entity.pieceData.color, id: entity.id, type: entity.pieceData.type, initialSquare: entity.pieceData.initialSquare, lastSquare: entity.pieceData.lastSquare};
			this.el.sceneEl.emit('addPiece', newPiece)
			NAF.connection.broadcastData('addPiece', newPiece);
		});
	},
	isOnBoard(piece) {
		const position = piece.getAttribute('position');
		const halfSquare = this.data.squareSize / 2;
		if (position.x < 0 - halfSquare || position.z < 0 - halfSquare || position.x > halfSquare * 15 || position.z > halfSquare * 15) {
			return false
		}
		return true;
	},
	normalizeCoordinate(coordinate) {
		return coordinate / this.data.squareSize;
	},
	denormalizeCoordinate(coordinate) {
		return coordinate * this.data.squareSize;
	},
	getRankFromPosition(position) {
		const halfSquare = this.data.squareSize / 2;
		const z = position.z;
		let rank = null;
		if (z < halfSquare) {
			rank = '8';
		} else if (z < (3 * halfSquare)) {
			rank = '7';
		} else if (z < (5 * halfSquare)) {
			rank = '6';
		} else if (z < (7 * halfSquare)) {
			rank = '5';
		} else if (z < (9 * halfSquare)) {
			rank = '4';
		} else if (z < (11 * halfSquare)) {
			rank = '3';
		} else if (z < (13 * halfSquare)) {
			rank = '2';
		} else if (z < (15 * halfSquare)) {
			rank = '1';
		}
		return rank;
	},
	getFileFromPosition(position) {
		const halfSquare = this.data.squareSize / 2;
		const x = position.x;
		let file = null;
		if (x < halfSquare) {
			file = 'a';
		} else if (x < (3 * halfSquare)) {
			file = 'b';
		} else if (x < (5 * halfSquare)) {
			file = 'c';
		} else if (x < (7 * halfSquare)) {
			file = 'd';
		} else if (x < (9 * halfSquare)) {
			file = 'e';
		} else if (x < (11 * halfSquare)) {
			file = 'f';
		} else if (x < (13 * halfSquare)) {
			file = 'g';
		} else if (x < (15 * halfSquare)) {
			file = 'h';
		}
		return file;
	},
	getPositionFromFile(file) {
		const halfSquare = this.data.squareSize / 2;
		let destinationX = null;
		switch (file) {
			case 'a':
				destinationX = 0;
				break;
			case 'b':
				destinationX = 2 * halfSquare;
				break;
			case 'c':
				destinationX = 4 * halfSquare;
				break;
			case 'd':
				destinationX = 6 * halfSquare;
				break;
			case 'e':
				destinationX = 8 * halfSquare;
				break;
			case 'f':
				destinationX = 10 * halfSquare;
				break;
			case 'g':
				destinationX = 12 * halfSquare;
				break;
			case 'h':
				destinationX = 14 * halfSquare;
				break;
		}
		return destinationX;
	},
	getPositionFromRank(rank) {
		const halfSquare = this.data.squareSize / 2;
		let destinationZ = null;
		rank = rank.toString();
		switch (rank) {
			case '8':
				destinationZ = 0;
				break;
			case '7':
				destinationZ = 2 * halfSquare;
				break;
			case '6':
				destinationZ = 4 * halfSquare;
				break;
			case '5':
				destinationZ = 6 * halfSquare;
				break;
			case '4':
				destinationZ = 8 * halfSquare;
				break;
			case '3':
				destinationZ = 10 * halfSquare;
				break;
			case '2':
				destinationZ = 12 * halfSquare;
				break;
			case '1':
				destinationZ = 14 * halfSquare;
				break;
		}
		return destinationZ;
	},
	getSquareFromPosition(position) {
		const file = this.getFileFromPosition(position);
		const rank = this.getRankFromPosition(position);
		const square = `${file}${rank}`;
		return {
			square,
			file,
			rank
		};
	},
	snapPiece(piece) {
		const destinationSquare = this.getSquareFromPosition(piece.getAttribute('position'));
		let destinationX = this.getPositionFromFile(destinationSquare.file);
		let destinationZ = this.getPositionFromRank(destinationSquare.rank);
		if (destinationX !== null && destinationZ !== null) {
			const isMoved = destinationX !== piece.pieceData.lastPosition.x ||
				piece.pieceData.pieceY !== piece.pieceData.lastPosition.y ||
				destinationZ !== piece.pieceData.lastPosition.z;
			if (isMoved) {
				this.moveTo(piece, destinationSquare.square);
				this.cursor.setAttribute('visible', 'false');
			}
		}
	},
	populateMoves(piece) {
		const lastSquare = this.getSquareFromPosition(piece.pieceData.lastPosition).square;		
		const moves = this.el.chess.moves({square: lastSquare, verbose: true}).map(m => m.to);
		piece.pieceData.moves = moves;
	},
	onPieceHeld(piece) {
		if (piece.pieceData.moves.length === 0) {
			this.populateMoves(piece);
		}
		const position = piece.getAttribute('position');
		const cursorHeight = this.data.squareSize * 1.6;
		const square = this.getSquareFromPosition(position).square;
		const isSquareValid = piece.pieceData.moves.indexOf(square) !== -1 || square === piece.pieceData.lastSquare;
		this.cursor.setAttribute('color', '#00cc00');
		this.cursor.setAttribute('position', `${position.x} ${cursorHeight} ${position.z}`);
		this.cursor.setAttribute('visible', 'true');
		if (this.isOnBoard(piece) === false || isSquareValid === false) {
			this.cursor.setAttribute('color', '#cc0000');
		}
		piece.pieceData.wasHeld = true;
	},
	onPieceGoBack(piece) {
		this.moveTo(piece, piece.pieceData.lastSquare);
		this.cursor.setAttribute('visible', 'false');
	},
	onPieceDropped(piece) {
		const destinationSquare = this.getSquareFromPosition(piece.getAttribute('position'));
		const destinationX = this.getPositionFromFile(destinationSquare.file);
		const destinationZ = this.getPositionFromRank(destinationSquare.rank);
		const currentY = piece.getAttribute('position').y;
		if (destinationX !== null && destinationZ !== null) {
			const isPositionChanged = destinationX !== piece.pieceData.lastPosition.x ||
				currentY !== piece.pieceData.lastPosition.y ||
				destinationZ !== piece.pieceData.lastPosition.z;
			if (isPositionChanged) {
				const moveDetails = {from: piece.pieceData.lastSquare, to: destinationSquare.square};
				if (piece.pieceData.type = 'p' && (destinationSquare.rank === '8' || destinationSquare.rank === '1')) {
					moveDetails.promotion = 'q';
				}
				const move = this.el.chess.move(moveDetails);
				if (move) {
					NAF.connection.broadcastData('sync-move', moveDetails);
					this.doMove(move);
				}
				if (!move || piece.pieceData.lastSquare === destinationSquare.square) {
					this.onPieceGoBack(piece);
				} else if (move) {
					if (this.data.snapToSquare) {
						this.snapPiece(piece);
					}
				}
			}
		}
	},
	doMove(move) {
		const isCapture = move.flags.indexOf('c') !== -1;
		const isQueensideCastle = move.flags.indexOf('q') !== -1;
		const isKingsideCastle = move.flags.indexOf('k') !== -1;
		const isEnPassant = move.flags.indexOf('e') !== -1;
		const isPromotion = move.flags.indexOf('p') !== -1;
		if (isCapture) {
			this.squareCaptured(move.to);
		}
		if (isQueensideCastle) {
			const fromSquare = (move.color === 'b') ? 'a8' : 'a1';
			const toSquare = (move.color === 'b') ? 'd8' : 'd1';
			const rook = this.getPieceFromSquare(fromSquare);
			this.moveTo(rook, toSquare);
		}
		if (isKingsideCastle) {
			const fromSquare = (move.color === 'b') ? 'h8' : 'h1';
			const toSquare = (move.color === 'b') ? 'f8' : 'f1';
			const rook = this.getPieceFromSquare(fromSquare);
			this.moveTo(rook, toSquare);
		}
		if (isEnPassant) {
			const fromRank = move.from.substr(1, 1);
			const toFile = move.to.substr(0, 1);
			this.squareCaptured(`${toFile}${fromRank}`);
		}
		if (isPromotion) {
			// TODO
			// const square = (isCapture) ? move.from : move.to;
			const square = move.to;
			setTimeout(() => {
				this.squarePromoted(square);
			}, 750);
		}
	},
	squarePromoted(square) {
		const oldPiece = this.getPieceFromSquare(square);
		const color = oldPiece.pieceData.color;
		const initialSquare = oldPiece.pieceData.initialSquare;
		window.NAF.connection.broadcastData('removePiece', { id: oldPiece.id, color });
		this.el.sceneEl.emit('removePiece', { id: oldPiece.id, color });
		oldPiece.parentNode.removeChild(oldPiece);
		const newPiece = {
			type: 'q', 
			color, 
			initialSquare, 
			model: (color === 'w') ? queenW : queenB, 
			sendTo: square
		};
		this.buildPiece(newPiece);
	},
	squareCaptured(square) {
		NAF.connection.sendData(this.state.opponentId, 'capture-piece', {square});
	},
	getPieceFromSquare(square) {
		const whitePieces = this.state.players.white.pieces.map(p => { p.color = 'w'; return p; });
		const blackPieces = this.state.players.black.pieces.map(p => { p.color = 'b'; return p; });
		const allPieces = whitePieces.concat(blackPieces);
		const pieceMeta = allPieces.filter(p => p.lastSquare === square)[0];
		const piece = document.querySelector(`#${pieceMeta.id}`);
		if (!piece.pieceData) {
			piece.pieceData = { color: pieceMeta.color};
		}
		return piece;
	},
	interactionHandler(piece) {
		const interaction = AFRAME.scenes[0].systems.interaction;
		const isHeld = interaction && interaction.isHeld(piece);
		if (isHeld) {
			this.onPieceHeld(piece);
		} else if (piece.pieceData.wasHeld) {
			if (this.isOnBoard(piece) === false) {
				this.onPieceGoBack(piece)
			} else {
				this.onPieceDropped(piece);
			}
			piece.pieceData.wasHeld = false;
		}
	},
	resetPieceRotation(piece) {
		if (this.data.invertKnights === true && piece.pieceData.type === 'n') {
			piece.setAttribute('rotation', '0 180 0');
		} else {
			piece.setAttribute('rotation', '0 0 0');
		}
	},
	moveTo(piece, square) {
		let rank = null;
		let file = null;
		if (typeof square === 'string') {
			const validSquare = /[a-h][1-8]/.test(square);
			if (!validSquare) return false;
			rank = square.substr(1,1);
			file = square.substr(0,1);
		} else if (square.hasOwnProperty('file') && square.hasOwnProperty('rank')) {
			rank = square.rank;
			file = square.file;
		} else {
			return false;
		}
		const position = {x: this.getPositionFromFile(file), y: piece.pieceData.pieceY,  z: this.getPositionFromRank(rank)};
		if (this.data.preventThrowing) {
			piece.setAttribute('body-helper', 'type: static;');
		}
		piece.setAttribute('position', position, true);
		this.resetPieceRotation(piece);
		piece.pieceData.lastPosition = position;
		piece.pieceData.lastSquare = `${file}${rank}`;
		const updateData = { id: piece.id, lastSquare: piece.pieceData.lastSquare, color: piece.pieceData.color };
		this.el.sceneEl.emit('updatePiece', updateData);
		NAF.connection.broadcastData('updatePiece', updateData);
		this.populateMoves(piece);
		if (this.data.preventThrowing) {
			piece.setAttribute('body-helper', '');
		}
		return true;
	},
	tick() {
		for (let piece of this.pieceEls) {
			this.interactionHandler(piece);
		}
	}
});
