import {
	addMedia
} from '../utils/media-utils';
import {
	getAbsoluteHref
} from '../utils/media-url-utils';
import rookB from '../assets/models/chess/rook-b.glb';
import knightB from '../assets/models/chess/knight-b.glb';
import bishopB from '../assets/models/chess/bishop-b.glb';
import queenB from '../assets/models/chess/queen-b.glb';
import kingB from '../assets/models/chess/king-b.glb';
import pawnB from '../assets/models/chess/pawn-b.glb';
import rookW from '../assets/models/chess/rook-w.glb';
import knightW from '../assets/models/chess/knight-w.glb';
import bishopW from '../assets/models/chess/bishop-w.glb';
import queenW from '../assets/models/chess/queen-w.glb';
import kingW from '../assets/models/chess/king-w.glb';
import pawnW from '../assets/models/chess/pawn-w.glb';


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
		}
	},
	init: function () {
		this.tick = AFRAME.utils.throttleTick(this.tick, 300, this);
		this.pieceEls = [];
		this.buildBoard = this.buildBoard.bind(this);
		this.getRankFromPosition = this.getRankFromPosition.bind(this);
		this.getFileFromPosition = this.getFileFromPosition.bind(this);
		this.getPositionFromRank = this.getPositionFromRank.bind(this);
		this.getPositionFromFile = this.getPositionFromFile.bind(this);
		this.positionToSquare = this.positionToSquare.bind(this);
		this.snapPiece = this.snapPiece.bind(this);
		this.normalizeCoordinate = this.normalizeCoordinate.bind(this);
		this.denormalizeCoordinate = this.denormalizeCoordinate.bind(this);
		this.interactionHandler = this.interactionHandler.bind(this);
		this.moveTo = this.moveTo.bind(this);

		this.buildBoard();
		setTimeout(()=>{
			// TODO: fix init error instead of timeout hack
			this.buildSet();
		},5000);
	},
	update: function () {},
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
			if (altColor) {
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
				true,
				true, {},
				true,
				this.el
			)
			entity.removeAttribute('listed-media');
			const pieceScale = (piece.type === 'p') ? this.data.squareSize / 0.28 : this.data.squareSize / 0.28;
			const file = piece.initialSquare.substr(0,1);
			const rank = piece.initialSquare.substr(1,1);
			const pieceX = this.getPositionFromFile(file);
			const pieceZ = this.getPositionFromRank(rank);
			const initialPosition = `${pieceX} ${this.el.pieceY} ${pieceZ}`;
			entity.setAttribute('scale', `${pieceScale} ${pieceScale} ${pieceScale}`);
			entity.setAttribute('position', initialPosition);
			entity.pieceData = {
				color: piece.color,
				type: piece.type,
				initialSquare: piece.initialSquare,
				lastPosition: entity.getAttribute('position'),
				currentPosition: entity.getAttribute('position')
			};
			// entity.setAttribute('floaty-object', '', true);
			// entity.removeAttribute('floaty-object');
			entity.setAttribute('listed-media', '', true);
			entity.removeAttribute('listed-media');
			entity.setAttribute('scalable-when-grabbed', '', true);
			entity.removeAttribute('scalable-when-grabbed');
			entity.setAttribute('hoverable-visuals', '', true);
			entity.removeAttribute('hoverable-visuals');
			this.pieceEls.push(entity);
		});

		this.cursor = document.createElement('a-box');
		this.cursor.setAttribute('height', this.data.squareSize / 4);
		this.cursor.setAttribute('width', this.data.squareSize / 4);
		this.cursor.setAttribute('depth', this.data.squareSize / 4);
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
	positionToSquare(position) {
		const file = this.getFileFromPosition(position);
		const rank = this.getRankFromPosition(position);
		return {
			file,
			rank
		};
	},
	snapPiece(piece) {
		const destinationSquare = this.positionToSquare(piece.getAttribute('position'));
		let destinationX = this.getPositionFromFile(destinationSquare.file);
		let destinationZ = this.getPositionFromRank(destinationSquare.rank);
		if (destinationX !== null && destinationZ !== null) {
			const isMoved = destinationX !== piece.pieceData.lastPosition.x ||
				this.el.pieceY !== piece.pieceData.lastPosition.y ||
				destinationZ !== piece.pieceData.lastPosition.z;
			if (isMoved) {
				this.moveTo(piece, destinationSquare);
				console.log(`Piece type: ${piece.pieceData.type} (color: ${piece.pieceData.color}) moved to ${destinationSquare.file}${destinationSquare.rank}`);
				this.cursor.setAttribute('visible', 'false');
			}
		}
	},
	interactionHandler(piece) {
		const interaction = AFRAME.scenes[0].systems.interaction;
		const isHeld = interaction && interaction.isHeld(piece);
		const position = piece.getAttribute('position');
		if (isHeld) {
			this.cursor.setAttribute('color', '#00cc00');
			const cursorHeight = this.data.squareSize * 1.6;
			this.cursor.setAttribute('position', `${position.x} ${cursorHeight} ${position.z}`);
			this.cursor.setAttribute('visible', 'true');
			if (this.isOnBoard(piece) === false) {
				this.cursor.setAttribute('color', '#cc0000');
			}
		} else {
			if (this.isOnBoard(piece) === false) {
				const lastSquare = this.positionToSquare(piece.pieceData.lastPosition);
				console.log(`Piece type: ${piece.pieceData.type} (color: ${piece.pieceData.color}) invalid move, return to last square: ${lastSquare.file}${lastSquare.rank} --- ${piece.pieceData.lastPosition.x} ${piece.pieceData.lastPosition.y} ${piece.pieceData.lastPosition.z}`);
				this.moveTo(piece, lastSquare);
				this.cursor.setAttribute('visible', 'false');
			} else {
				const destinationSquare = this.positionToSquare(piece.getAttribute('position'));
				let destinationX = this.getPositionFromFile(destinationSquare.file);
				let destinationZ = this.getPositionFromRank(destinationSquare.rank);
				if (destinationX !== null && destinationZ !== null) {
					const isMoved = destinationX !== piece.pieceData.lastPosition.x ||
						this.el.pieceY !== piece.pieceData.lastPosition.y ||
						destinationZ !== piece.pieceData.lastPosition.z;
					if (isMoved) {
						if (this.data.snapToSquare) {
							this.snapPiece(piece);
						}
					}
				}
			}
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
		const position = {x: this.getPositionFromFile(file), y: this.el.pieceY,  z: this.getPositionFromRank(rank)};

		if (this.data.preventThrowing) {
			piece.setAttribute('body-helper', 'type: static;');
		}
		piece.setAttribute('position', position, true);
		piece.setAttribute('rotation', '0 0 0');
		piece.pieceData.lastPosition = position;
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