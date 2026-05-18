// Domain and routing code throw HttpError for expected API failures. The server
// can then translate those failures into the intended HTTP status code.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
