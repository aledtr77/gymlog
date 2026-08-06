/**
 * Minimal pub/sub. The only coupling between features is a topic string,
 * so any module can be swapped without the others knowing.
 */
const topics = new Map();

export function on(topic, fn) {
  if (!topics.has(topic)) topics.set(topic, new Set());
  topics.get(topic).add(fn);
  return () => topics.get(topic).delete(fn);
}

export function emit(topic, payload) {
  topics.get(topic)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (error) {
      console.error(`[bus] ${topic}`, error);
    }
  });
  topics.get('*')?.forEach((fn) => fn({ topic, payload }));
}
