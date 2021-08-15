import React, { useState, useEffect, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { useGetBetByRoundId, useGetCurrentEpoch } from 'state/hooks'
import { BetPosition, Round } from 'state/types'
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
  const { id, epoch, lockPrice, closePrice, totalAmount, bullAmount, bearAmount, failed } = round
  const currentEpoch = useGetCurrentEpoch()
  const { account } = useWeb3React()
  const [isPreviousRoundFailed, setIsPreviousRoundFailed] = useState(false)
  const [isCurrentRoundExpiredWithoutLock, setIsCurrentRoundExpiredWithoutLock] = useState(false)
  const bet = useGetBetByRoundId(account, id)

  const hasEntered = bet !== null
  const hasEnteredUp = hasEntered && bet.position === BetPosition.BULL
  const hasEnteredDown = hasEntered && bet.position === BetPosition.BEAR
  const bullMultiplier = getMultiplier(totalAmount, bullAmount)
  const bearMultiplier = getMultiplier(totalAmount, bearAmount)

  const canBetWithoutStart = useMemo(() => {
    if (epoch === currentEpoch && lockPrice === 0) {
      return !failed
    }
    return isPreviousRoundFailed && epoch === currentEpoch + 1
  }, [currentEpoch, epoch, failed, isPreviousRoundFailed, lockPrice])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (previousRound?.epoch === currentEpoch) {
        setIsPreviousRoundFailed(Boolean(previousRound?.failed))
      }
    }, 12000)
    return () => {
      clearInterval(interval)
    }
  }, [currentEpoch, previousRound?.epoch, previousRound?.failed])

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsCurrentRoundExpiredWithoutLock(failed)
    }, 12000)
    return () => {
      clearInterval(interval)
    }
  }, [failed])

  // Next (open) round
  if (canBetWithoutStart) {
    return (
      <OpenRoundCard
        round={round}
        hasEnteredDown={hasEnteredDown}
        hasEnteredUp={hasEnteredUp}
        betAmount={bet?.amount}
        bullMultiplier={bullMultiplier}
        bearMultiplier={bearMultiplier}
        isAvailableToRestartManual={isPreviousRoundFailed}
      />
    )
  }

  // Live round
  if (closePrice === 0 && epoch === currentEpoch - 1) {
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
