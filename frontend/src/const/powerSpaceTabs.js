import { SportsGymnastics as SportsGymnasticsIcon, FitnessCenter as FitnessCenterIcon, Tv as TvIcon, Gavel as GavelIcon, Visibility as VisibilityIcon, Storage as StorageIcon, Groups as GroupsIcon } from "@mui/icons-material"

export const powerspaceTabs = [
  { label: "Atletas", icon: <SportsGymnasticsIcon />, route: "/admin/atletas" },
  { label: "Equipos", icon: <GroupsIcon />, route: "/admin/equipos" },
  { label: "Intentos", icon: <FitnessCenterIcon />, route: "/admin/intentos" },
  { label: "Cargadores", icon: <TvIcon />, route: "/admin/cargadores" },
  { label: "Referees", icon: <GavelIcon />, route: "/admin/referees" },
  { label: "Datos", icon: <StorageIcon />, route: "/admin/historico" },
  { label: "Vista Pública", icon: <VisibilityIcon />, route: "/publico/vista" },
]
