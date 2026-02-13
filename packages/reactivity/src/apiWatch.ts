import { isFunction, isObject } from '@mini-vue/shared'
import { ReactiveEffect } from './effect'
import { isReactive } from './reactive'
import { isRef } from './ref'

export function watch(source, cb, options = {} as any) {
  // watchEffect也是基于doWatch来实现的
  return doWatch(source, cb, options)
}

export function watchEffect(getter, options = {}) {
  // 没有 cb 就是watchEffect
  return doWatch(getter, {}, options as any)
}

// 遍历函数
// 可控制 depth 已经遍历到了当前哪一层
// Set防止循环引用无限递归
function traverse(
  source,
  depth: number | undefined,
  currentDepth = 0,
  seen = new Set(),
) {
  if (!isObject(source)) {
    return source
  }
  if (depth) {
    if (currentDepth >= depth) {
      return source
    }
    // 根据 deep 属性来看是否是深度
    currentDepth++
  }
  if (seen.has(source)) {
    return source
  }
  // 防止对象的循环引用
  seen.add(source)
  for (const key in source) {
    traverse(source[key], depth, currentDepth, seen)
  }
  return source
}

function doWatch(source, cb, { deep, immediate }) {
  // source ? -> getter

  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined)

  // getter是响应式对象||回调函数
  // 产生一个可以给reactEffect来使用的getter，需要对这个对象进行取值操作，会关联当前的reactiveEffect
  let getter
  // 是响应式才处理
  if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isFunction(source)) {
    getter = source
  }

  let clean
  const onCleanup = (fn) => {
    clean = () => {
      fn()
      clean = undefined
    }
  }

  let oldValue

  const job = () => {
    if (cb) {
      const newValue = effect.run()

      if (clean) {
        // 在执行回调前，先调用上一次的清理操作
        clean()
      }

      // cb函数是用户写的函数
      cb(newValue, oldValue, onCleanup)
      oldValue = newValue
    } else {
      effect.run()
    }
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    // 立即先执行一次用户的回调，传递新值和老值
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    // watchEffect
    effect.run() // 直接执行即可
  }

  const unwatch = () => {
    effect.stop()
  }

  return unwatch
}
