import { request, gql } from 'graphql-request'
import { GRAPH_API_PREDICTION } from 'config/constants/endpoints'
import { ethers } from 'ethers'
import { Bet, BetPosition, Market, PredictionsState, PredictionStatus, Round, RoundData } from 'state/types'
import { multicallv2 } from 'utils/multicall'
import predictionsAbi from 'config/abi/predictions.json'
import { getPredictionsAddress } from 'utils/addressHelpers'

import { getPredictionsContract } from 'utils/contractHelpers'
import { BetResponse, RoundResponse, TotalWonMarketResponse, TotalWonRoundResponse } from './queries'
// eslint-disable-next-line import/no-cycle
import { filterClaimed, getLastedRounds, getLedgerByRoundId, getRoundInfo, getUserInfo } from '.'

export enum Result {
  WIN = 'win',
  LOSE = 'lose',
  CANCELED = 'canceled',
  LIVE = 'live',
}

export const numberOrNull = (value: string) => {
  if (value === null) {
    return null
  }

  const valueNum = Number(value)
  return Number.isNaN(valueNum) ? null : valueNum
}

export const makeFutureRoundResponse = (epoch: number, startBlock: number): RoundResponse => {
  return {
    id: epoch.toString(),
    epoch: epoch.toString(),
    startBlock: startBlock.toString(),
    failed: null,
    startAt: null,
    lockAt: null,
    lockBlock: null,
    lockPrice: null,
    endBlock: null,
    closePrice: null,
    totalBets: '0',
    totalAmount: '0',
    bearBets: '0',
    bullBets: '0',
    bearAmount: '0',
    bullAmount: '0',
    position: null,
    bets: [],
  }
}

export const transformBetResponse = (betResponse: BetResponse): Bet => {
  const bet = {
    id: betResponse.id,
    hash: betResponse.hash,
    // @ts-ignore
    amount: betResponse.amount ? parseFloat(betResponse.amount) : 0,
    position: betResponse.position,
    claimed: betResponse.claimed,
    claimedHash: betResponse.claimedHash,
    user: {
      id: betResponse.user.id,
      address: betResponse.user.address,
      block: numberOrNull(betResponse.user.block),
      totalBets: numberOrNull(betResponse.user.totalBets),
      totalBNB: numberOrNull(betResponse.user.totalBNB),
    },
  } as Bet

  if (betResponse.round) {
    bet.round = transformRoundResponse(betResponse.round)
  }

  return bet
}

export const transformRoundResponse = (roundResponse: RoundResponse): Round => {
  const {
    id,
    epoch,
    failed,
    startBlock,
    startAt,
    lockAt,
    lockBlock,
    lockPrice,
    endBlock,
    closePrice,
    totalBets,
    totalAmount,
    bullBets,
    bearBets,
    bearAmount,
    bullAmount,
    position,
    bets = [],
  } = roundResponse

  const getRoundPosition = (positionResponse: string) => {
    if (positionResponse === 'Bull') {
      return BetPosition.BULL
    }

    if (positionResponse === 'Bear') {
      return BetPosition.BEAR
    }

    return null
  }

  return {
    id,
    failed,
    epoch: numberOrNull(epoch),
    startBlock: numberOrNull(startBlock),
    startAt: numberOrNull(startAt),
    lockAt: numberOrNull(lockAt),
    lockBlock: numberOrNull(lockBlock),
    lockPrice: lockPrice ? parseFloat(lockPrice) : null,
    endBlock: numberOrNull(endBlock),
    closePrice: closePrice ? parseFloat(closePrice) : null,
    totalBets: numberOrNull(totalBets),
    totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
    bullBets: numberOrNull(bullBets),
    bearBets: numberOrNull(bearBets),
    bearAmount: numberOrNull(bearAmount),
    bullAmount: numberOrNull(bullAmount),
    position: getRoundPosition(position),
    bets: bets.map(transformBetResponse),
  }
}

export const transformTotalWonResponse = (
  marketResponse: TotalWonMarketResponse,
  roundResponse: TotalWonRoundResponse[],
): number => {
  const houseRounds = roundResponse.reduce((accum, round) => {
    return accum + (round.totalAmount ? parseFloat(round.totalAmount) : 0)
  }, 0)

  const totalBNB = marketResponse.totalBNB ? parseFloat(marketResponse.totalBNB) : 0
  const totalBNBTreasury = marketResponse.totalBNBTreasury ? parseFloat(marketResponse.totalBNBTreasury) : 0

  return Math.max(totalBNB - (totalBNBTreasury + houseRounds), 0)
}

export const makeRoundData = (rounds: Round[]): RoundData => {
  return rounds.reduce((accum, round) => {
    return {
      ...accum,
      [round.id]: round,
    }
  }, {})
}

export const getRoundResult = (bet: Bet, currentEpoch: number): Result => {
  const { round } = bet

  if (round.failed) {
    return Result.CANCELED
  }

  if (round.epoch >= currentEpoch - 1) {
    return Result.LIVE
  }
  const roundResultPosition = round.closePrice >= round.lockPrice ? BetPosition.BULL : BetPosition.BEAR

  return bet.position === roundResultPosition ? Result.WIN : Result.LOSE
}

/**
 * Given a bet object, check if it is eligible to be claimed or refunded
 */
export const getCanClaim = (bet: Bet) => {
  return !bet.claimed && (bet.position === bet.round.position || bet.round.failed === true)
}

/**
 * Returns only bets where the user has won.
 * This is necessary because the API currently cannot distinguish between an uncliamed bet that has won or lost
 */
export const getUnclaimedWinningBets = (bets: Bet[]): Bet[] => {
  return bets.filter(getCanClaim)
}

type StaticPredictionsData = Pick<
  PredictionsState,
  'status' | 'currentEpoch' | 'intervalBlocks' | 'bufferBlocks' | 'minBetAmount' | 'rewardRate'
>

/**
 * Gets static data from the contract
 */
export const getStaticPredictionsData = async (): Promise<StaticPredictionsData> => {
  const calls = ['currentEpoch', 'intervalBlocks', 'minBetAmount', 'paused', 'bufferBlocks', 'rewardRate'].map(
    (method) => ({
      address: getPredictionsAddress(),
      name: method,
    }),
  )
  const [[currentEpoch], [intervalBlocks], [minBetAmount], [isPaused], [bufferBlocks], [rewardRate]] =
    await multicallv2(predictionsAbi, calls)

  return {
    status: isPaused ? PredictionStatus.PAUSED : PredictionStatus.LIVE,
    currentEpoch: currentEpoch.toNumber(),
    intervalBlocks: intervalBlocks.toNumber(),
    bufferBlocks: bufferBlocks.toNumber(),
    minBetAmount: minBetAmount.toString(),
    rewardRate: rewardRate.toNumber(),
  }
}
function getFiveNumbers(input: number) {
  if (!input) return []
  const amountOfNumber = input < 5 ? input : 5
  const result = []
  for (let i = input; i > input - amountOfNumber; i--) {
    result.push(i)
  }
  return result
}
export const getMarketData = async (): Promise<{
  rounds: Round[]
  market: Market
}> => {
  const [[paused], [currentEpoch]] = (await multicallv2(
    predictionsAbi,
    ['paused', 'currentEpoch'].map((name) => ({
      address: getPredictionsAddress(),
      name,
    })),
  )) as [[boolean], [ethers.BigNumber]]
  const contract = getPredictionsContract()
  const rounds: any[] = await getLastedRounds(contract, getFiveNumbers(currentEpoch.toNumber()))

  return {
    rounds: rounds.filter((round) => round !== null).map(transformRoundResponse),
    market: {
      epoch: currentEpoch.toNumber(),
      paused,
    },
  }
}

export const getTotalWon = async (): Promise<number> => {
  const response = (await request(
    GRAPH_API_PREDICTION,
    gql`
      query getTotalWonData($position: String) {
        market(id: 1) {
          totalBNB
          totalBNBTreasury
        }
        rounds(where: { position: $position }) {
          totalAmount
        }
      }
    `,
    { position: BetPosition.HOUSE },
  )) as { market: TotalWonMarketResponse; rounds: TotalWonRoundResponse[] }

  return transformTotalWonResponse(response.market, response.rounds)
}

export const getBetHistoryByRoundIds = async (account: string, roundIds: string[]): Promise<BetResponse[]> => {
  const contract = getPredictionsContract()
  const promises = []
  for (let i = 0; i < roundIds.length; i++) {
    promises.push(
      new Promise((resolve) => {
        getBetByContract(contract, roundIds[i], account).then((bet) => {
          getUserInfo(account).then((user) => {
            getRoundInfo(contract, roundIds[i]).then((round) => {
              resolve({
                ...bet,
                user,
                round,
              })
            })
          })
        })
      }),
    )
  }
  const result = await Promise.all(promises)
  return result
}
export const getUnClaimedBets = async (account: string, contract: any) => {
  const [roundsNum] = await contract.getUserRounds(account, 0, 100)
  const roundDetailPromises = []
  for (let i = 0; i < roundsNum.length; i++) {
    roundDetailPromises.push(
      new Promise((resolve, reject) => {
        try {
          getLedgerByRoundId(contract, account, roundsNum[i]).then((ledger) => {
            getRoundInfo(contract, roundsNum[i].toNumber()).then((value) => {
              getUserInfo(account).then((user) => {
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
  const bets = filterClaimed(roundDetailList, false).map(transformBetResponse)

  return bets
}

export const getBetByContract = async (contract: any, id: string, account: string) => {
  const [position, amount, claimed] = await contract.ledger(id, account)
  const _amount = amount.div(10 ** 9).toNumber() / 10 ** 9
  return {
    // eslint-disable-next-line no-nested-ternary
    position: _amount === 0 ? undefined : position === 0 ? BetPosition.BULL : BetPosition.BEAR,
    amount: _amount,
    claimed,
  }
}
