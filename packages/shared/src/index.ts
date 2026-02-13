export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object'
}

export function isFunction(value: any): boolean {
  return typeof value === 'function'
}
