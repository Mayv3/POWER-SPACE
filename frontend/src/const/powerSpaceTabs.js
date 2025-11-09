import SportsGymnasticsIcon from "@mui/icons-material/SportsGymnastics"
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter"
import TvIcon from "@mui/icons-material/Tv"
import GavelIcon from "@mui/icons-material/Gavel"
import VisibilityIcon from "@mui/icons-material/Visibility"

export const powerspaceTabs = [
  { label: "Atletas", icon: <SportsGymnasticsIcon />, route: "/admin/atletas" },
  { label: "Intentos", icon: <FitnessCenterIcon />, route: "/admin/intentos" },
  { label: "Cargadores", icon: <TvIcon />, route: "/admin/cargadores" },
  { label: "Jueces", icon: <GavelIcon />, route: "/admin/jueces" },
  { label: "Vista Pública", icon: <VisibilityIcon />, route: "/publico/vista" },
]
