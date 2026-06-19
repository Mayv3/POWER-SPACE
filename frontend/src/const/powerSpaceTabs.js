import { PersonSimpleRun as SportsGymnasticsIcon, Barbell as FitnessCenterIcon, Television as TvIcon, Gavel as GavelIcon, Eye as VisibilityIcon, Database as StorageIcon, UsersThree as GroupsIcon, UserGear as SupervisorAccountIcon } from "@phosphor-icons/react"

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
