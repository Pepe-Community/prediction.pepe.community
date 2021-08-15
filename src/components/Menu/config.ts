import { MenuEntry } from '@pancakeswap/uikit'
import { ContextApi } from 'contexts/Localization/types'

const config: (t: ContextApi['t']) => MenuEntry[] = (t) => [
  {
    label: t('Pepe Prediction'),
    icon: 'HomeIcon',
    href: '/',
  },
  {
    label: t('Trade'),
    icon: 'TradeIcon',
    href: 'https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x0c1b3983d2a4aa002666820de5a0b43293291ea6',
    target: '_blank',
  },

  {
    label: t('More'),
    icon: 'MoreIcon',
    items: [
      {
        label: t('About'),
        href: 'https://pepe.community',
      },
      {
        label: t('FrogBank'),
        href: 'https://frogbank.pepe.community',
      },
      {
        label: t('WhitePaper'),
        href: 'https://frogbank.pepe.community',
      },
      {
        label: t('XBN'),
        href: 'https://xbn.finance',
      },
    ],
  },
]

export const socials = [
  {
    label: 'Telegram',
    icon: 'TelegramIcon',
    items: [
      {
        label: 'Announcements',
        href: 'https://t.me/pepeofficialchannel',
      },
      {
        label: 'Global',
        href: 'https://t.me/PEPEcommunity',
      },
      {
        label: 'Tiếng Việt',
        href: 'https://t.me/pepecommunityvietnam',
      },
    ],
  },
  {
    label: 'Twitter',
    icon: 'TwitterIcon',
    href: 'https://twitter.com/pepe_community',
  },
]
export const MENU_HEIGHT = 64
export const MENU_ENTRY_HEIGHT = 48
export const SIDEBAR_WIDTH_FULL = 240
export const SIDEBAR_WIDTH_REDUCED = 56
export default config
