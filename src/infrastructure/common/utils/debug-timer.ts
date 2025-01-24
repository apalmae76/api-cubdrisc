/**
 * Logs the execution duration of an asynchronous callback function in milliseconds.
 *
 * - Starts a timer before invoking the callback.
 * - Logs a message with the provided context and the duration of the callback's execution.
 * - Returns the result of the callback function.
 *
 * @template T The return type of the callback function.
 * @param cb The asynchronous callback function to measure.
 * @param context A string to provide context for the logged message.
 * @returns {Promise<T>} The result of the executed callback function.
 */
export const consoleLogDebugTimer = async <T>(
  cb: () => Promise<T>,
  context: string,
): Promise<T> => {
  const startTimer = Date.now();
  const cbData = await cb();
  console.log(`${context}, duration ${Date.now() - startTimer} ms`);
  return cbData;
};
