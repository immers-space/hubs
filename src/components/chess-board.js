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
		}
	},
	init: function () {
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
		this.pieceCaptured = this.pieceCaptured.bind(this);
		this.teardownSet = this.teardownSet.bind(this);
	},
	startGame: function() {
		this.el.chess = new Chess();
	},
	update: function () {
		this.teardownSet();
		while(this.el.firstChild) {
			this.el.removeChild(this.el.firstChild);
		}
		const yCorrections = this.data.yCorrections.split(" ");
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
		setTimeout(()=>{
			// TODO: fix init error instead of timeout hack
			this.buildSet();
		},5000);
		this.startGame();
	},
	teardownSet() {
		for (let i = 0; i < this.pieceEls.length; i++) {
			const targetEl = this.pieceEls[i];
			NAF.utils.takeOwnership(targetEl);
	        targetEl.parentNode.removeChild(targetEl);
		}
		this.pieceEls = [];
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
	buildSet: function () {
		const pieces = [
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
		const contentOrigin = 1;
		pieces.forEach(piece => {
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
			const file = piece.initialSquare.substr(0,1);
			const rank = piece.initialSquare.substr(1,1);
			const pieceX = this.getPositionFromFile(file);
			const pieceZ = this.getPositionFromRank(rank);
			entity.pieceData = {
				color: piece.color,
				type: piece.type,
				initialSquare: piece.initialSquare,
				lastSquare: piece.initialSquare,
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
			setTimeout(() => {
				// Temporary hack to remove pin/delete/etc menu
				entity.firstChild.setAttribute('visible', 'false');
			}, 5000);
			this.pieceEls.push(entity);
		});
		this.cursor = document.createElement('a-sphere');
		this.cursor.setAttribute('radius', this.data.squareSize / 8);
		this.el.appendChild(this.cursor);
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
				const move = this.el.chess.move({from: piece.pieceData.lastSquare, to: destinationSquare.square});
				if (move) {
					const isCapture = move.flags.indexOf('c') !== -1;
					const isQueensideCastle = move.flags.indexOf('q') !== -1;
					const isKingsideCastle = move.flags.indexOf('k') !== -1;
					const isEnPassant = move.flags.indexOf('e') !== -1;
					const isPromotion = move.flags.indexOf('p') !== -1;
					if (isCapture) {
						const capturedPiece = this.getPieceFromSquare(move.to);
						this.pieceCaptured(capturedPiece);
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
						const capturedPawn = this.getPieceFromSquare(`${toFile}${fromRank}`);
						this.pieceCaptured(capturedPawn);
					}
					if (isPromotion) {
						// TODO
					}
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
	pieceCaptured(piece) {
		const currentPosition = piece.getAttribute('position');
		const newPosition = `${currentPosition.x} ${this.el.pieceY * 2.5} ${currentPosition.z}`;
		piece.setAttribute('position', newPosition);
		piece.setAttribute('visible', 'false');
		piece.pieceData.lastSquare = '';
	},
	getPieceFromSquare(square) {
		const piece = this.pieceEls.filter(p => p.pieceData.lastSquare === square)[0];
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