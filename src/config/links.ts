export const VEHICLE_SALES_URL = 'https://www.imantrucksales.com'

// Old temporary sales site. Stored page content may still point here until the
// database migration runs, so treat it as unset.
const OLD_VEHICLE_SALES_URL = 'https://tiny-kringle-175161.netlify.app/'

export function vehicleSalesUrl(url?: string | null) {
  return !url || url === OLD_VEHICLE_SALES_URL ? VEHICLE_SALES_URL : url
}

export const TRUCKING_SCHOOL_URL = 'https://imantruckingschool.com/'
