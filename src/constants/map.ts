export const MML_API_KEY = process.env.EXPO_PUBLIC_MML_API_KEY ?? ''

export const MML_BACKGROUND_TILE_URL =
  `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png?api-key=${MML_API_KEY}`

export const INITIAL_REGION = {
  latitude: 60.1699,
  longitude: 24.9384,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
}