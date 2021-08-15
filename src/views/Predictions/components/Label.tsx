import React, { useEffect } from 'react'
import { useCountUp } from 'react-countup'
import styled from 'styled-components'
import { Box, Card, PocketWatchIcon, Text } from '@pancakeswap/uikit'
import { useGetLastedBTCPrice } from 'state/hooks'
import { useTranslation } from 'contexts/Localization'
import { formatRoundTime } from '../helpers'
import useRoundCountdown from '../hooks/useRoundCountdown'
import BTCIcon from './BTCIcon'

const Token = styled(Box)`
  margin-top: -24px;
  position: absolute;
  top: 50%;
  z-index: 30;

  & > svg {
    height: 48px;
    width: 48px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    margin-top: -32px;

    & > svg {
      height: 64px;
      width: 64px;
    }
  }
`

const Title = styled(Text)`
  font-size: 16px;
  line-height: 21px;

  ${({ theme }) => theme.mediaQueries.lg} {
    font-size: 20px;
    line-height: 22px;
  }
`

const Price = styled(Text)`
  height: 18px;
  justify-self: start;
  width: 80px;

  ${({ theme }) => theme.mediaQueries.lg} {
    text-align: center;
  }
`

const Interval = styled(Text)`
  ${({ theme }) => theme.mediaQueries.lg} {
    text-align: center;
    width: 32px;
  }
`

const Label = styled(Card)<{ dir: 'left' | 'right' }>`
  align-items: ${({ dir }) => (dir === 'right' ? 'flex-end' : 'flex-start')};
  border-radius: ${({ dir }) => (dir === 'right' ? '8px 8px 8px 24px' : '8px 8px 24px 8px')};
  display: flex;
  flex-direction: column;
  overflow: initial;
  padding: ${({ dir }) => (dir === 'right' ? '0 28px 0 8px' : '0 8px 0 24px')};

  ${({ theme }) => theme.mediaQueries.lg} {
    align-items: center;
    border-radius: 16px;
    flex-direction: row;
    padding: ${({ dir }) => (dir === 'right' ? '8px 40px 8px 8px' : '8px 8px 8px 40px')};
  }
`

const BitcoinIcon = styled(BTCIcon)`
  padding-right: 8px;
`

export const PricePairLabel: React.FC = () => {
  const btcPrice = useGetLastedBTCPrice()
  const { countUp, update } = useCountUp({
    start: 0,
    end: btcPrice,
    duration: 1,
    decimals: 3,
  })

  useEffect(() => {
    update(btcPrice)
  }, [btcPrice, update])

  return (
    <Box pl="24px" position="relative" display="inline-block">
      <Token left={-8}>
        <BitcoinIcon />
      </Token>
      <Label dir="left">
        <Title bold textTransform="uppercase">
          BTCBUSD
        </Title>
        <Price fontSize="12px">{`$${countUp}`}</Price>
      </Label>
    </Box>
  )
}

interface TimerLabelProps {
  interval: string
  unit: 'm' | 'h' | 'd'
}

export const TimerLabel: React.FC<TimerLabelProps> = ({ interval, unit }) => {
  const seconds = useRoundCountdown()
  const countdown = formatRoundTime(seconds)
  const { t } = useTranslation()

  return (
    <Box pr="24px" position="relative">
      <Label dir="right">
        <Title bold color="secondary">
          {seconds === 0 ? t('Closing') : countdown}
        </Title>
        <Interval fontSize="12px">{`${interval}${t(unit)}`}</Interval>
      </Label>
      <Token right={0}>
        <PocketWatchIcon />
      </Token>
    </Box>
  )
}
