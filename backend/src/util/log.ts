export function logRequest(
  method: string,
  path: string,
  status: number,
  requestId: string
): void {
  console.log(
    JSON.stringify({
      level: "info",
      method,
      path,
      status,
      requestId,
    })
  );
}

export function logError(msg: string, requestId: string): void {
  console.error(
    JSON.stringify({
      level: "error",
      message: msg,
      requestId,
    })
  );
}
