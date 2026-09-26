import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { consultationSlots } from './serviceCatalog'

export type ConsultationService = {
  id: string
  name: string
  description: string
  duration: number
  price: number
  icon: typeof LocalShippingOutlinedIcon
  includes: string[]
}

export const services: ConsultationService[] = [
  {
    id: 'brokerage',
    name: 'Freight Brokerage Consultation',
    description: 'Get focused guidance on launching, structuring, or improving your freight brokerage operation.',
    duration: 60,
    price: 149,
    icon: BusinessCenterOutlinedIcon,
    includes: ['Business model review', 'Broker operations guidance', 'Personalized action plan'],
  },
  {
    id: 'trucking',
    name: 'Trucking Business Consultation',
    description: 'Work through operations, compliance, revenue strategy, and growth priorities for your trucking business.',
    duration: 60,
    price: 149,
    icon: LocalShippingOutlinedIcon,
    includes: ['Operational assessment', 'Revenue strategy', 'Next-step recommendations'],
  },
  {
    id: 'dispatch',
    name: 'Dispatch Services Consultation',
    description: 'Build a practical plan for starting, managing, or scaling a professional dispatch service.',
    duration: 45,
    price: 119,
    icon: SupportAgentOutlinedIcon,
    includes: ['Dispatch workflow review', 'Carrier acquisition guidance', 'Growth roadmap'],
  },
  {
    id: 'cdl',
    name: 'CDL School Consultation',
    description: 'Understand training pathways, program expectations, and the steps toward your trucking career.',
    duration: 30,
    price: 79,
    icon: SchoolOutlinedIcon,
    includes: ['Training pathway review', 'Program guidance', 'Preparation checklist'],
  },
]

export const availableSlots = consultationSlots.map(time => ({ time, available: true }))
