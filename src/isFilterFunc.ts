import { FilterFunc } from "./types"

export const isFilterFunc = <V>(filter: unknown): filter is FilterFunc => {
  return typeof filter === 'function' && filter.arguments.length === 2
}