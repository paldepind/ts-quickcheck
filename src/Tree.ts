import * as Utils from './Utils'

export interface StrictTree<A> {
  readonly top: A
  readonly forest: StrictTree<A>[]
}

export class Tree<A> {
  constructor(readonly top: A, readonly forest: () => Tree<A>[]) {}
  static of<A>(a: A): Tree<A> {
    return new Tree(a, () => [])
  }
  static tree<A>(top: A, forest: () => Tree<A>[]): Tree<A> {
    return new Tree(top, forest)
  }
  static tree$<A>(top: A, forest: Tree<A>[]): Tree<A> {
    return new Tree(top, () => forest)
  }
  map<B>(f: (a: A) => B): Tree<B> {
    return this.chain((a: A) => Tree.of(f(a)))
  }
  chain<B>(f: (a: A) => Tree<B>): Tree<B> {
    const t = f(this.top)
    return new Tree(t.top, () => [...this.forest().map(t => t.chain(f)), ...t.forest()])
  }

  left_first_pair<B>(tb: Tree<B>): Tree<[A, B]> {
    return this.chain(a => tb.chain(b => Tree.of(Utils.pair(a, b))))
  }
  fair_pair<B>(tb: Tree<B>): Tree<[A, B]> {
    return Tree.dist({a: this, b: tb}).map(p => Utils.pair(p.a, p.b))
  }

  /** returns the last but leftmost subtree without any backtracking
   where the property is true */
  left_first_search(p: (a: A) => boolean, fuel = -1): {tree: Tree<A>; fuel: number} | undefined {
    if (p(this.top)) {
      return dfs(p, this, fuel)
    } else {
      return undefined
    }
  }

  /** distribute fairly */
  static dist<T extends Record<string, any>>(trees: {[K in keyof T]: Tree<T[K]>}): Tree<T> {
    const keys: (keyof T)[] = Object.keys(trees)
    function shrink_one(k: keyof T): Tree<T>[] {
      return trees[k].forest().map(t => Tree.dist({...(trees as any), [k]: t}) as Tree<T>)
    }
    return new Tree<T>(Utils.dict(keys, k => trees[k].top), () =>
      Utils.flatten(keys.map(shrink_one))
    )
  }

  /** distribute array fairly */
  static dist_array<A>(trees: Tree<A>[]): Tree<A[]> {
    const length = trees.length
    return Tree.dist(trees as any).map(t => Array.from({...t, length}))
  }

  /** debugging function to view the tree evaluated */
  force(depth: number = -1): StrictTree<A> {
    return {
      top: this.top,
      forest: depth == 0 ? [] : this.forest().map(t => t.force(depth - 1)),
    }
  }
}

const resolution = 0.01

function halves(n: number, round = (x: number) => Math.floor(x)): number[] {
  const out: number[] = []
  let i = n
  do {
    i = round(i / 2)
    out.push(i)
  } while (i > resolution)
  return out
}

export function shrinkNumber(n: number, towards: number = 0): Tree<number> {
  if (towards != 0) {
    return shrinkNumber(towards - n).map(i => towards - i)
  } else if (n < 0) {
    return shrinkNumber(-n).map(i => -i)
  } else {
    return (function go(i: number): Tree<number> {
      const candidates: number[] = []
      if (i > 0) {
        // binary search:
        candidates.push(...halves(i))
        // binary search with fractions
        if (Math.round(i) != i && i > resolution) {
          candidates.push(...halves(i, x => x))
        }
      }
      // fallback: linear search, although this is not really feasible in a big range
      const range = 10
      for (let j = i - 1, c = 0; j > Math.ceil(i / 2) && c < range; j--, c++) {
        candidates.push(j)
      }
      return new Tree(i, () => candidates.map(go))
    })(n)
  }
}

/** Assumes that the property already holds for the top of the tree. */
export function dfs<A>(
  p: (a: A) => boolean,
  tree: Tree<A>,
  fuel: number
): {tree: Tree<A>; fuel: number} | undefined {
  const forest = tree.forest()
  for (let i = 0; i < forest.length; i++) {
    if (fuel == 0) {
      break
    }
    fuel--
    if (p(forest[i].top)) {
      return dfs(p, forest[i], fuel)
    }
  }
  return {tree, fuel}
}
