// src/config/navigation.ts
import { 
  LayoutDashboard, Mail, BookOpen, MapPin, Layers, GraduationCap,
  UserSquare2, Settings, ClipboardList, ListChecks, PencilRuler, Calendar
} from "lucide-react";
import { Permission } from "./permissions";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  requiredPermission?: Permission;
};

export const INICIO: NavItem[] = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard, 
    requiredPermission: 'view:dashboard' 
  },
  { 
    title: "Central de Notas", 
    url: "/notas", 
    icon: PencilRuler, 
    requiredPermission: 'view:grades'
  },
];

export const ESTRUTURA_BASE: NavItem[] = [
  { 
    title: "Polos", 
    url: "/polos", 
    icon: MapPin, 
    requiredPermission: 'view:polos' 
  },
  { 
    title: "Cursos", 
    url: "/cursos", 
    icon: BookOpen, 
    requiredPermission: 'view:courses' 
  },
  { 
    title: "Turmas", 
    url: "/turmas", 
    icon: Layers, 
    requiredPermission: 'view:classes' 
  },
  { 
    title: "Disciplinas", 
    url: "/disciplinas", 
    icon: ClipboardList, 
    requiredPermission: 'view:disciplines' 
  },
];

export const PESSOAS_BASE: NavItem[] = [
  { 
    title: "Alunos", 
    url: "/alunos", 
    icon: GraduationCap, 
    requiredPermission: 'view:students' 
  },
];

export const PESSOAS_ADMIN: NavItem[] = [
  { 
    title: "Colaboradores", 
    url: "/colaboradores", 
    icon: UserSquare2, 
    requiredPermission: 'view:collaborators'
  },
];

export const ADMIN_ONLY: NavItem[] = [
  { 
    title: "Templates de Notas", 
    url: "/templates-notas", 
    icon: ListChecks, 
    requiredPermission: 'view:templates-notas' 
  },
  { 
    title: "Convites", 
    url: "/convites", 
    icon: Mail, 
    requiredPermission: 'view:invites'
  },
  { 
    title: "Configurações", 
    url: "/configuracoes", 
    icon: Settings, 
    requiredPermission: 'view:configurations'
  },
];

// Item de Períodos Letivos
export const PERIODOS_ITEM: NavItem = { 
  title: "Períodos", 
  url: "/periodos", 
  icon: Calendar, 
  requiredPermission: 'view:periods' 
};