export default function Exception(message: string, status: number = 500) {
  const error = new Error(message);
  //@ts-ignore
  error.statusCode = status;
  return error;
}

Exception.prototype = Object.create(Error.prototype);