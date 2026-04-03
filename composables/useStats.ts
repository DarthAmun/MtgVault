import { db } from '~/db'
import type { CollectionStats, Rarity } from '~/types'

export function useStats() {
  async function getCollectionStats(): Promise<CollectionStats> {
    const entries = await db.collection.toArray()

    let totalCards = 0
    let totalFoils = 0
    let totalProxies = 0
    let totalValue = 0
    const uniqueCards = new Set<string>()
    const byColor: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
    const byRarity: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, mythic: 0, special: 0, bonus: 0 }
    const bySet: Record<string, { setName: string; count: number }> = {}
    const byType: Record<string, number> = {}

    for (const entry of entries) {
      totalCards += entry.quantity + (entry.foilQuantity ?? 0)
      totalFoils += entry.foilQuantity ?? 0
      if (entry.isProxy) totalProxies += entry.quantity

      const sc = await db.scryfallCards.get(entry.scryfallId)
      if (!sc) continue

      uniqueCards.add(sc.oracle_id ?? sc.id)

      // Value
      const price = parseFloat(sc.prices?.usd ?? '0') || 0
      const priceFoil = parseFloat(sc.prices?.usd_foil ?? '0') || 0
      totalValue += price * entry.quantity + priceFoil * (entry.foilQuantity ?? 0)

      // Colors
      for (const c of sc.color_identity ?? []) {
        byColor[c] = (byColor[c] ?? 0) + entry.quantity
      }
      if ((sc.color_identity ?? []).length === 0) byColor['C'] += entry.quantity

      // Rarity
      if (sc.rarity) {
        byRarity[sc.rarity as Rarity] = (byRarity[sc.rarity as Rarity] ?? 0) + entry.quantity
      }

      // Set
      const setKey = sc.set
      if (!bySet[setKey]) bySet[setKey] = { setName: sc.set_name ?? setKey, count: 0 }
      bySet[setKey].count += entry.quantity

      // Type
      const mainType = sc.type_line?.split('—')[0]?.trim().split(' ').pop() ?? 'Unknown'
      byType[mainType] = (byType[mainType] ?? 0) + entry.quantity
    }

    const bySetArr = Object.entries(bySet)
      .map(([set, v]) => ({ set, setName: v.setName, count: v.count }))
      .sort((a, b) => b.count - a.count)

    const recentlyAdded = [...entries]
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 10)

    const totalDecks = await db.decks.count()

    return {
      totalCards,
      uniqueCards: uniqueCards.size,
      totalDecks,
      totalValue,
      totalFoils,
      totalProxies,
      byColor,
      byRarity,
      byFormat: {},
      bySet: bySetArr,
      byType,
      recentlyAdded,
      mostUsedCards: [],
      valueOverTime: [],
    }
  }

  return { getCollectionStats }
}
