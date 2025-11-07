import { Home, Users, Building2, FileText, Calendar, Settings as SettingsIcon, LogOut, Store, HomeIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const mainItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Proprietários", url: "/proprietarios", icon: Building2 },
    { title: "Inquilinos", url: "/inquilinos", icon: Users },
    { title: "Imóveis Aluguel", url: "/imoveis/aluguel", icon: HomeIcon },
    { title: "Imóveis Venda", url: "/imoveis/venda", icon: Building2 },
    { title: "Pontos Comerciais", url: "/imoveis/ponto-comercial", icon: Store },
    { title: "Boletos", url: "/boletos", icon: FileText },
    { title: "Contratos Avulsos", url: "/contratos-avulsos", icon: Calendar },
  ];

  const adminItems = isAdmin
    ? [
        { title: "Relatórios", url: "/relatorios", icon: FileText },
        { title: "Configurações", url: "/configuracoes", icon: SettingsIcon }
      ]
    : [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {adminItems.length > 0 && (
                <>
                  <Separator className="my-2" />
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-accent"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <Separator className="mb-2" />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
