import BigNumber from 'bignumber.js'
import { Nullable } from 'types/Nullable'
import { allTokens, toCurrencyString } from 'utils/commons'
import { Token, tokens } from 'utils/config'
import { create } from 'zustand'

export interface CoinPrice {
  coingecko_id: string
  priceUsd: number
}

interface TokenPricesState {
  priceMapping: Map<string, number>
  init: () => void
  isInitialized: boolean
  getPrice: (token: Token) => Nullable<string>
  getValuePrice: (token: Token, amount: BigNumber) => Nullable<number>
  getPriceByCoingeckoId: (coingeckoId: string) => Nullable<number>
}

export const useTokenPricesStore = create<TokenPricesState>()((set, get) => ({
  priceMapping: null,
  isInitialized: false,
  init: () => {
    const coinGeckoIds = allTokens
      .map((token) => token.coingecko_id)
      .filter(Boolean)
      .join(',')

    const apiKey = import.meta.env.VITE_COINGECKO_API_KEY
    const baseUrl = apiKey
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3'

    set({ isInitialized: true })

    fetch(`${baseUrl}/simple/price?ids=${coinGeckoIds}&vs_currencies=usd`, {
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : {}
    })
      .then((resp) => resp.json())
      .then((result: { [coingecko_id: string]: { usd: number } }) => {
        const priceMapping = new Map<string, number>()
        Object.entries(result).forEach(([coingecko_id, { usd }]) => {
          priceMapping.set(coingecko_id, usd)
        })

        set({
          priceMapping: priceMapping
        })
      })
      .catch((error) => {
        console.error(error)
        set({
          priceMapping: new Map<string, number>()
        })
      })
  },
  getPriceByCoingeckoId: (coingeckoId: string): Nullable<number> => {
    if (!get().isInitialized) {
      get().init()
    }
    return get().priceMapping?.get(coingeckoId) ?? null
  },
  getPrice: (token: Token) => {
    if (!get().isInitialized) {
      get().init()
    }
    const tokenPrice = get().priceMapping?.get(token.coingecko_id)
    if (tokenPrice !== undefined) {
      return toCurrencyString(tokenPrice)
    }
    return null
  },
  getValuePrice: (token: Token, amount: BigNumber = new BigNumber(1)): Nullable<number> => {
    if (!get().isInitialized) {
      get().init()
    }
    const tokenPrice = get().priceMapping?.get(token.coingecko_id)
    if (tokenPrice !== undefined) {
      const result = new BigNumber(tokenPrice).multipliedBy(amount).dividedBy(`1e${token.decimals}`)
      return Number(result)
    }
    return null
  }
}))
