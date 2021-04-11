class ImmersMessageDispatch extends EventTarget {
  setDispatchHandler(dispatchHandler) {
    this.dispatchHandler = dispatchHandler;
  }

  dispatch(message) {
    this.dispatchHandler(message);
  }
}

export default new ImmersMessageDispatch();
