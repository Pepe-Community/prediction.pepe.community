import React from 'react'
import styled from 'styled-components'
import BounceLoader from 'react-spinners/BounceLoader'
import Page from './layout/Page'

const Wrapper = styled(Page)`
  display: flex;
  justify-content: center;
  align-items: center;
`

const PageLoader: React.FC = () => {
  return (
    <Wrapper>
      <BounceLoader color="#31D0AA" loading size={150} />
    </Wrapper>
  )
}

export default PageLoader
