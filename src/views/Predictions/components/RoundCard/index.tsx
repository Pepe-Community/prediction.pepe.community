import React, { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { useGetBetByRoundId, useGetCurrentEpoch } from 'state/hooks'
import { BetPosition, Round } from 'state/types'
import Web3 from 'web3'
import { isBefore } from 'date-fns'
import { getMultiplier } from '../../helpers'
import ExpiredRoundCard from './ExpiredRoundCard'
import LiveRoundCard from './LiveRoundCard'
import OpenRoundCard from './OpenRoundCard'
import SoonRoundCard from './SoonRoundCard'

interface RoundCardProps {
  round: Round
  previousRound?: Round
}

const RoundCard: React.FC<RoundCardProps> = ({ round, previousRound }) => {
  const { id, epoch, lockPrice, closePrice, totalAmount, bullAmount, bearAmount, lockBlock } = round
  const currentEpoch = useGetCurrentEpoch()
  const { account } = useWeb3React()
  const [isPrevRoundExpiredWithoutLock, setIsPrevRoundExpiredWithoutLock] = useState(false)
  const [isCurrentRoundExpiredWithoutLock, setIsCurrentRoundExpiredWithoutLock] = useState(false)
  const bet = useGetBetByRoundId(account, id)
  const hasEntered = bet !== null
  const hasEnteredUp = hasEntered && bet.position === BetPosition.BULL
  const hasEnteredDown = hasEntered && bet.position === BetPosition.BEAR
  const bullMultiplier = getMultiplier(totalAmount, bullAmount)
  const bearMultiplier = getMultiplier(totalAmount, bearAmount)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      try {
        if (previousRound?.epoch === currentEpoch) {
          const web3 = new Web3(Web3.givenProvider)
          const data = await web3.eth.getBlock(previousRound.lockBlock)

          if (data) {
            const time = new Date(Number(data?.timestamp) * 1000)

            if (isBefore(time, new Date())) {
              setIsPrevRoundExpiredWithoutLock(true)
            }
          }
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [currentEpoch, previousRound?.epoch, previousRound?.lockBlock])
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      try {
        if (currentEpoch && lockBlock) {
          const web3 = new Web3(Web3.givenProvider)
          const data = await web3.eth.getBlock(lockBlock)

          if (data) {
            const time = new Date(Number(data?.timestamp) * 1000)

            if (isBefore(time, new Date())) {
              setIsCurrentRoundExpiredWithoutLock(true)
            }
          }
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [currentEpoch, lockBlock])

  if (isCurrentRoundExpiredWithoutLock) {
    return (
      <ExpiredRoundCard
        round={{ ...round, failed: true }}
        hasEnteredDown={hasEnteredDown}
        hasEnteredUp={hasEnteredUp}
        betAmount={bet?.amount}
        bullMultiplier={bullMultiplier}
        bearMultiplier={bearMultiplier}
      />
    )
  }
  if (epoch === currentEpoch) {
    console.log(epoch)

    console.log(bet)
  }
  // Next (open) round
  if ((epoch === currentEpoch && lockPrice === 0) || isPrevRoundExpiredWithoutLock) {
    return (
      <OpenRoundCard
        round={round}
        hasEnteredDown={hasEnteredDown}
        hasEnteredUp={hasEnteredUp}
        betAmount={bet?.amount}
        bullMultiplier={bullMultiplier}
        bearMultiplier={bearMultiplier}
        isAvailableToRestartManual={isPrevRoundExpiredWithoutLock}
      />
    )
  }

  // Live round
  if (closePrice === null && epoch === currentEpoch - 1) {
    return (
      <LiveRoundCard
        betAmount={bet?.amount}
        hasEnteredDown={hasEnteredDown}
        hasEnteredUp={hasEnteredUp}
        round={round}
        bullMultiplier={bullMultiplier}
        bearMultiplier={bearMultiplier}
      />
    )
  }

  // Fake future rounds
  if (epoch > currentEpoch) {
    return <SoonRoundCard round={round} />
  }

  // Past rounds
  return (
    <ExpiredRoundCard
      round={round}
      hasEnteredDown={hasEnteredDown}
      hasEnteredUp={hasEnteredUp}
      betAmount={bet?.amount}
      bullMultiplier={bullMultiplier}
      bearMultiplier={bearMultiplier}
    />
  )
}

export default RoundCard
