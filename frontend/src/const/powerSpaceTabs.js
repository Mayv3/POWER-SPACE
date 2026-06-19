import { SportsGymnastics as SportsGymnasticsIcon, FitnessCenter as FitnessCenterIcon, Tv as TvIcon, Gavel as GavelIcon, Visibility as VisibilityIcon, Storage as StorageIcon, Groups as GroupsIcon, SupervisorAccount as SupervisorAccountIcon } from "@mui/icons-material"

export const powerspaceTabs = [
  { label: "Atletas", icon: <SportsGymnasticsIcon />, route: "/admin/atletas" },
  { label: "Equipos", icon: <GroupsIcon />, route: "/admin/equipos" },
  { label: "Coaches", icon: <SupervisorAccountIcon />, route: "/admin/coaches" },
  { label: "Intentos", icon: <FitnessCenterIcon />, route: "/admin/intentos" },
  { label: "Cargadores", icon: <TvIcon />, route: "/admin/cargadores" },
  { label: "Jueces", icon: <GavelIcon />, route: "/admin/jueces" },
  { label: "Datos", icon: <StorageIcon />, route: "/admin/historico" },
  { label: "Vista Pública", icon: <VisibilityIcon />, route: "/publico/vista" },
]
