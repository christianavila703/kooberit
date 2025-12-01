export function arraysEqual(a: any[], b: any[]): boolean {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
  
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
  
    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return false;
    }
  
    return true;
}