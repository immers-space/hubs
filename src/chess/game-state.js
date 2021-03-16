import { GAME_MODE, COLOR } from './game-constants';

AFRAME.registerState({
  initialState: {
    players: {
      white: {
        id: null,
        profile: {
          avatarId: null,
          displayName: null,
          followers: null,
          handle: null,
          id: null,
          inbox: null,
          outbox: null
        },
        pieces: []
      },
      black: {
        id: null,
        profile: {
          avatarId: null,
          displayName: null,
          followers: null,
          handle: null,
          id: null,
          inbox: null,
          outbox: null
        },
        pieces: []
      }
    },
    imPlaying: false,
    myColor: null,
    opponentColor: null,
    opponentId: null,
    gameMode: GAME_MODE.NONE
  },
  handlers: {
    setGameMode: function(state, action) {
      state.gameMode = action.gameMode;
    },
    imPlaying: function(state, action) {
      state.imPlaying = true;
      state.myColor = action.color;
      state.opponentColor = action.color === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;
      state.opponentId = state.players[state.opponentColor].id ? state.players[state.opponentColor].id : null;
      this.setPlayer(state, action);
    },
    setPlayer: function(state, action) {
      state.players[action.color].id = action.id;
      state.players[action.color].profile.avatarId = action.profile.avatarId;
      state.players[action.color].profile.displayName = action.profile.displayName;
      state.players[action.color].profile.followers = action.profile.followers;
      state.players[action.color].profile.handle = action.profile.handle;
      state.players[action.color].profile.id = action.profile.id;
      state.players[action.color].profile.inbox = action.profile.inbox;
      state.players[action.color].profile.outbox = action.profile.outbox;
      state.players[action.color].pieces = action.pieces || [];
    },
    setPieces: function(state, action) {
      state.players[action.color].pieces = action.pieces;
    },
    addPiece: function(state, action) {
      const color = action.color === COLOR.W || action.color === COLOR.WHITE ? COLOR.WHITE : COLOR.BLACK;
      state.players[color].pieces.push({
        id: action.id,
        type: action.type,
        initialSquare: action.initialSquare,
        lastSquare: action.lastSquare
      });
    },
    updatePiece: function(state, action) {
      const color = action.color === COLOR.W || action.color === COLOR.WHITE ? COLOR.WHITE : COLOR.BLACK;
      const updateIndex = state.players[color].pieces
        .map(function(piece) {
          return piece.id;
        })
        .indexOf(action.id);
      state.players[color].pieces[updateIndex].lastSquare = action.lastSquare;
    },
    removePiece: function(state, action) {
      const color = action.color === COLOR.W || action.color === COLOR.WHITE ? COLOR.WHITE : COLOR.BLACK;
      const removeIndex = state.players[color].pieces
        .map(function(piece) {
          return piece.id;
        })
        .indexOf(action.id);
      state.players[color].pieces.splice(removeIndex, 1);
    },
    resetChessState: function(state) {
      state.imPlaying = false;
      state.myColor = null;
      state.opponentColor = null;
      state.opponentId = null;
      state.players.white.id = null;
      state.players.white.profile.avatarId = null;
      state.players.white.profile.displayName = null;
      state.players.white.profile.followers = null;
      state.players.white.profile.handle = null;
      state.players.white.profile.id = null;
      state.players.white.profile.inbox = null;
      state.players.white.profile.outbox = null;
      state.players.white.pieces = [];
      state.players.black.id = null;
      state.players.black.profile.avatarId = null;
      state.players.black.profile.displayName = null;
      state.players.black.profile.followers = null;
      state.players.black.profile.handle = null;
      state.players.black.profile.id = null;
      state.players.black.profile.inbox = null;
      state.players.black.profile.outbox = null;
      state.players.black.pieces = [];
    }
  }
});
