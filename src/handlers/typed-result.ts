interface TypedResult<T> {
  tag: string;
  duration: number;
  result: T;
}

export const timed = async <T>(
  tag: string,
  block: () => Promise<T>,
): Promise<TypedResult<T>> => {
  const start = new Date().valueOf();
  let result = await block();
  let duration = new Date().valueOf() - start;
  return { tag, duration, result };
};
