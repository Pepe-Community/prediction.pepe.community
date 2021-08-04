/* eslint-disable no-param-reassign */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import maxBy from 'lodash/maxBy'
import merge from 'lodash/merge'
import { BIG_ZERO } from 'utils/bigNumber'
import { Bet, BetPosition, HistoryFilter, Market, PredictionsState, PredictionStatus, Round } from 'state/types'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'
// eslint-disable-next-line import/no-cycle
import {
  makeFutureRoundResponse,
  transformRoundResponse,
  getBetHistory,
  transformBetResponse,
  getBet,
  makeRoundData,
  getBetByContract,
} from './helpers'

const initialState: PredictionsState = {
  status: PredictionStatus.INITIAL,
  isLoading: false,
  isHistoryPaneOpen: false,
  isChartPaneOpen: false,
  isFetchingHistory: false,
  historyFilter: HistoryFilter.ALL,
  currentEpoch: 0,
  currentRoundStartBlockNumber: 0,
  intervalBlocks: 100,
  bufferBlocks: 2,
  minBetAmount: '1000000000000000',
  rewardRate: 97,
  lastOraclePrice: BIG_ZERO.toJSON(),
  rounds: {},
  history: {},
  bets: {},
}

// Thunks
export const fetchBet = createAsyncThunk<{ account: string; bet: Bet }, { account: string; id: string; contract: any }>(
  'predictions/fetchBet',
  async ({ account, id, contract }) => {
    const response = await getBet(id)

    const r1 = await getBetByContract(contract, id, account)
    console.log({ r1 })
    const bet = transformBetResponse(response)
    return { account, bet }
  },
)

export const fetchRoundBet = createAsyncThunk<
  { account: string; roundId: string; bet: Bet },
  { account: string; roundId: string }
>('predictions/fetchRoundBet', async ({ account, roundId }) => {
  const betResponses = await getBetHistory({
    user: account.toLowerCase(),
    round: roundId,
  })

  // This should always return 0 or 1 bet because a user can only place
  // one bet per round
  if (betResponses && betResponses.length === 1) {
    const [betResponse] = betResponses
    return { account, roundId, bet: transformBetResponse(betResponse) }
  }

  return { account, roundId, bet: null }
})

/**
 * Used to poll the user bets of the current round cards
 */
export const fetchCurrentBets = createAsyncThunk<
  { account: string; bets: Bet[] },
  { account: string; roundIds: string[] }
>('predictions/fetchCurrentBets', async ({ account, roundIds }) => {
  const betResponses = await getBetHistory({
    user: account.toLowerCase(),
    round_in: roundIds,
  })

  return { account, bets: betResponses.map(transformBetResponse) }
})

const getEvent = async (contract: any, account: string, roundId: number, startBlock: number, lastedBlock: number) => {
  const blockLimit = 5000
  if (startBlock === lastedBlock) {
    return null
  }
  try {
    const filter = await contract.filters.Claim(account, roundId, null)
    const event = await contract.queryFilter(filter, startBlock, startBlock + blockLimit)
    return event
  } catch (e) {
    return getEvent(contract, account, roundId, startBlock + blockLimit, lastedBlock)
  }
}

const getLedgerByRoundId = async (contract: any, account: string, roundId: string) => {
  try {
    const [position, amount, _claimed] = await contract.ledger(roundId, account)
    return {
      position: position === 0 ? BetPosition.BULL : BetPosition.BEAR,
      amount: ((amount as BigNumber).div(10 ** 9).toNumber() / 10 ** 9).toFixed(3),
      claimed: _claimed,
      claimedHash: '0xa4860fd610fc29455ece7e6b30649884009fe428d9b42ad651c85187585853a6',
      hash: '0x9f456e9ba2f15dcf79f733c2c93a6e4c3f288af27eed1e388971046c89b01be2',
      id: '0x5704acfae90dca975cc4af7d7bd8d056e9bee87c062b0000',
    }
  } catch (e) {
    return null
  }
}

const getRoundInfo = async (contract: any, roundId: string) => {
  try {
    const [id, startBlock, lockBlock, endBlock, lockPrice, closePrice, totalAmount, bullAmount, bearAmount] =
      await contract.rounds(roundId)
    const web3 = new Web3(Web3.givenProvider)
    const currentBlock = await web3.eth.getBlockNumber()
    const failed = currentBlock > endBlock.toNumber()

    return {
      id: id.toString(),
      epoch: id.toString(),
      startBlock: startBlock.toString(),
      lockBlock: lockBlock.toString(),
      endBlock: endBlock.toString(),
      lockPrice: (lockPrice.toNumber() / 10 ** 8).toString(),
      closePrice: (closePrice / 10 ** 8).toString(),
      totalAmount: (totalAmount.div(10 ** 8).toNumber() / 10 ** 10).toString(),
      bullAmount: (bullAmount.div(10 ** 8).toNumber() / 10 ** 10).toString(),
      bearAmount: (bearAmount.div(10 ** 8).toNumber() / 10 ** 10).toString(),
      failed,
      position: lockPrice.gt(closePrice) ? BetPosition.BEAR : BetPosition.BULL,
    }
  } catch (e) {
    console.log(e)
    return null
  }
}
const getUserInfo = async (contract: any, account: string) => {
  const web3 = new Web3(Web3.givenProvider)
  const currentBlock = await web3.eth.getBlockNumber()
  const totalBNB = await web3.eth.getBalance(account)
  return {
    address: account,
    block: currentBlock,
    totalBNB: new BigNumber(totalBNB).div(10 ** 9).toNumber() / 10 ** 9,
    totalBets: 0,
  }
}

export const getLastedRounds = async (contract: any, roundIds: string[]) => {
  const roundPromises = roundIds.map((id) => {
    return getRoundInfo(contract, id)
  })

  return Promise.all(roundPromises)
}

function filterClaimed(data: any[], claimed: boolean | undefined) {
  if (claimed === undefined) {
    return data
  }
  if (!claimed) {
    return data.filter((record) => !record.claimed)
  }
  return data.filter((record) => record.claimed)
}
export const fetchHistory = createAsyncThunk<
  { account: string; bets: Bet[] },
  { account: string; claimed?: boolean; contract?: any }
>('predictions/fetchHistory', async ({ account, claimed, contract }) => {
  const [roundsNum] = await contract.getUserRounds(account, 0, 100)
  const roundDetailPromises = []
  for (let i = 0; i < roundsNum.length; i++) {
    roundDetailPromises.push(
      new Promise((resolve, reject) => {
        try {
          getLedgerByRoundId(contract, account, roundsNum[i]).then((ledger) => {
            getRoundInfo(contract, roundsNum[i].toNumber()).then((value) => {
              getUserInfo(contract, account).then((user) => {
                resolve({
                  ...ledger,
                  round: value,
                  user,
                })
              })
            })
          })
        } catch (e) {
          reject(e)
        }
      }),
    )
  }
  const roundDetailList = await Promise.all(roundDetailPromises)

  const bets = filterClaimed(roundDetailList, claimed).map(transformBetResponse)

  return { account, bets }
})

export const predictionsSlice = createSlice({
  name: 'predictions',
  initialState,
  reducers: {
    setPredictionStatus: (state, action: PayloadAction<PredictionStatus>) => {
      state.status = action.payload
    },
    setHistoryPaneState: (state, action: PayloadAction<boolean>) => {
      state.isHistoryPaneOpen = action.payload
      state.historyFilter = HistoryFilter.ALL
    },
    setChartPaneState: (state, action: PayloadAction<boolean>) => {
      state.isChartPaneOpen = action.payload
    },
    setHistoryFilter: (state, action: PayloadAction<HistoryFilter>) => {
      state.historyFilter = action.payload
    },
    initialize: (state, action: PayloadAction<Partial<PredictionsState>>) => {
      return {
        ...state,
        ...action.payload,
      }
    },
    updateMarketData: (state, action: PayloadAction<{ rounds: Round[]; market: Market }>) => {
      const { rounds, market } = action.payload
      const newRoundData = makeRoundData(rounds)
      const incomingCurrentRound = maxBy(rounds, 'epoch')

      if (state.currentEpoch !== incomingCurrentRound.epoch) {
        // Add new round
        const newestRound = maxBy(rounds, 'epoch') as Round
        const futureRound = transformRoundResponse(
          makeFutureRoundResponse(newestRound.epoch + 2, newestRound.startBlock + state.intervalBlocks),
        )

        newRoundData[futureRound.id] = futureRound
      }

      state.currentEpoch = incomingCurrentRound.epoch
      state.currentRoundStartBlockNumber = incomingCurrentRound.startBlock
      state.status = market.paused ? PredictionStatus.PAUSED : PredictionStatus.LIVE
      state.rounds = { ...state.rounds, ...newRoundData }
    },
    setCurrentEpoch: (state, action: PayloadAction<number>) => {
      state.currentEpoch = action.payload
    },
    markBetAsCollected: (state, action: PayloadAction<{ account: string; roundId: string }>) => {
      const { account, roundId } = action.payload
      const accountBets = state.bets[account]

      if (accountBets && accountBets[roundId]) {
        accountBets[roundId].claimed = true
      }
    },
    markPositionAsEntered: (state, action: PayloadAction<{ account: string; roundId: string; bet: Bet }>) => {
      const { account, roundId, bet } = action.payload

      state.bets = {
        ...state.bets,
        [account]: {
          ...state.bets[account],
          [roundId]: bet,
        },
      }
    },
    setLastOraclePrice: (state, action: PayloadAction<string>) => {
      state.lastOraclePrice = action.payload
    },
  },
  extraReducers: (builder) => {
    // Get unclaimed bets
    builder.addCase(fetchCurrentBets.fulfilled, (state, action) => {
      const { account, bets } = action.payload
      const betData = bets.reduce((accum, bet) => {
        return {
          ...accum,
          [bet.round.id]: bet,
        }
      }, {})

      state.bets = merge({}, state.bets, {
        [account]: betData,
      })
    })

    // Get round bet
    builder.addCase(fetchRoundBet.fulfilled, (state, action) => {
      const { account, roundId, bet } = action.payload

      if (bet) {
        state.bets = {
          ...state.bets,
          [account]: {
            ...state.bets[account],
            [roundId]: bet,
          },
        }
      }
    })

    // Update Bet
    builder.addCase(fetchBet.fulfilled, (state, action) => {
      const { account, bet } = action.payload
      state.history[account] = [...state.history[account].filter((currentBet) => currentBet.id !== bet.id), bet]
    })

    // Show History
    builder.addCase(fetchHistory.pending, (state) => {
      state.isFetchingHistory = true
    })
    builder.addCase(fetchHistory.rejected, (state) => {
      state.isFetchingHistory = false
      state.isHistoryPaneOpen = true
    })
    builder.addCase(fetchHistory.fulfilled, (state, action) => {
      const { account, bets } = action.payload

      state.isFetchingHistory = false
      state.isHistoryPaneOpen = true
      state.history[account] = bets

      // Save any fetched bets in the "bets" namespace
      const betData = bets.reduce((accum, bet) => {
        return {
          ...accum,
          [bet.round.id]: bet,
        }
      }, {})

      state.bets = merge({}, state.bets, {
        [account]: betData,
      })
    })
  },
})

// Actions
export const {
  initialize,
  setChartPaneState,
  setCurrentEpoch,
  setHistoryFilter,
  setHistoryPaneState,
  updateMarketData,
  markBetAsCollected,
  setPredictionStatus,
  markPositionAsEntered,
  setLastOraclePrice,
} = predictionsSlice.actions

export default predictionsSlice.reducer
