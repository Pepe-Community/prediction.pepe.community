import React from 'react'
import { Modal, Text, Button, Flex, InjectedModalProps } from '@pancakeswap/uikit'
import { getPredictionsContract } from 'utils/contractHelpers'
import { useTranslation } from '../../../contexts/Localization'

const RestartGameModal: React.FC<InjectedModalProps> = ({ onDismiss }) => {
  const { t } = useTranslation()

  // This is required because the modal exists outside the Router
  const handleClick = async () => {
    const contract = getPredictionsContract()
    const result = await contract.genesisStartRound()
    onDismiss()
  }

  return (
    <Modal title={t('Congratulations!')} onDismiss={onDismiss}>
      <Flex flexDirection="column" alignItems="center" justifyContent="center">
        <Text bold color="secondary" fontSize="24px" mb="24px">
          {t('Game is pause')}
        </Text>
        <Button onClick={handleClick}>{t('Restart now')}</Button>
      </Flex>
    </Modal>
  )
}

export default RestartGameModal
