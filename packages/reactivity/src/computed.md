计算属性与原属性的通信是通过**Vue 响应式系统的依赖收集和触发机制**实现的，具体过程如下：

### 1. **依赖收集阶段**（计算属性如何关联原属性）

```typescript
// 计算属性创建时
this._effect = new ReactiveEffect(
  () => getter(this._value), // getter是用户提供的计算函数
  () => {
    triggerRefValue(this) // 触发计算属性的依赖更新
    this._effect._dirtyLevel = DirtyLevels.Dirty
  }
)
```

当首次访问计算属性的 `.value` 时：

```typescript
get value() {
  if (this._effect.dirty) {
    this._value = this._effect.run() // 执行effect.run()
    trackRefValue(this) // 收集依赖计算属性的effect
  }
  return this._value
}
```

#### 核心通信链路：

1. `effect.run()` 执行时，会将 `activeEffect` 设置为计算属性的 `_effect`
2. 然后执行用户提供的 `getter` 函数（如 `() => count.value * 2`）
3. `getter` 访问原属性（`count.value`）时，会触发原属性的 `track` 函数
4. `track` 函数会将当前的 `activeEffect`（即计算属性的 `_effect`）**收集到原属性的依赖集合中**

### 2. **依赖更新阶段**（原属性变化如何通知计算属性）

当原属性变化时（如 `count.value = 1`）：

1. 原属性的 `set` 函数会触发 `trigger` 函数
2. `trigger` 函数找到原属性的依赖集合，其中包含计算属性的 `_effect`
3. 执行计算属性 `_effect` 的 `scheduler` 函数：
   ```typescript
   ;() => {
     triggerRefValue(this) // 通知依赖计算属性的其他effect（如渲染）
     this._effect._dirtyLevel = DirtyLevels.Dirty // 将计算属性标记为脏值
   }
   ```

### 3. **重新计算阶段**（计算属性如何获取新值）

当下次访问计算属性的 `.value` 时：

1. 检查到 `this._effect.dirty` 为 `true`
2. 重新执行 `this._effect.run()`，调用 `getter` 获取新值
3. 将计算属性标记为不脏（`_dirtyLevel = DirtyLevels.NoDirty`）
4. 返回新计算的值

### 通信流程图：

```
原属性变化 → trigger() → 执行计算属性的scheduler → 计算属性标记为脏值 → 下次访问计算属性 → 重新执行getter获取新值
```

### 核心要点：

- **双向依赖**：原属性的依赖集合包含计算属性的 `_effect`，计算属性的依赖集合包含使用它的其他 effect
- **懒加载**：计算属性只有在被访问且是脏值时才会重新计算
- **自动更新**：原属性变化时，计算属性会自动标记为脏值，并在需要时重新计算

这种机制确保了计算属性能够与原属性保持同步，同时实现了高效的缓存和懒加载特性。
