import React from 'react'
import styled from 'styled-components'
import { Text, Skeleton } from '@pancakeswap/uikit'

interface Props {
  cakePriceUsd?: number
}

const PriceLink = styled.a`
  display: flex;
  align-items: center;
  img {
    width: 24px;
    margin-right: 8px;
    transition: transform 0.3s;
  }
  :hover {
    img {
      transform: scale(1.2);
    }
  }
`

const CakePrice: React.FC<Props> = ({ cakePriceUsd }) => {
  return cakePriceUsd ? (
    <PriceLink href="https://pancakeswap.info/token/0x0c1b3983d2a4aa002666820de5a0b43293291ea6" target="_blank">
      {/* <PancakeRoundIcon width="24px" mr="8px" /> */}
      <img src="https://www.pepe.community/assets/img/logo.png" alt="logo" />
      <Text color="textSubtle" bold>{`$${cakePriceUsd.toFixed(5)}`}</Text>
    </PriceLink>
  ) : (
    <Skeleton width={80} height={24} />
  )
}

export default React.memo(CakePrice)
