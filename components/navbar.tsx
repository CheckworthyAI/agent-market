"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Kbd,
  Link,
  TextField,
  InputGroup,
  Avatar,
  Dropdown,
  Selection,
} from "@heroui/react";
import NextLink from "next/link";
import clsx from "clsx";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
  HeartFilledIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const searchInput = (
    <TextField aria-label="Search" type="search">
      <InputGroup>
        <InputGroup.Prefix>
          <SearchIcon className="text-base text-muted-foreground pointer-events-none flex-shrink-0" />
        </InputGroup.Prefix>
        <InputGroup.Input className="text-sm" placeholder="Search..." />
        <InputGroup.Suffix>
          <Kbd className="hidden lg:inline-flex">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-divider bg-surface/95 backdrop-blur-md">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <NextLink className="flex items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-xl tracking-tight text-foreground ml-1">
              AgentMarket
            </p>
          </NextLink>
          <ul className="hidden lg:flex gap-4 ml-2">
            {user && (
              <li>
                <NextLink
                  className="text-foreground hover:text-muted-foreground transition-colors font-medium"
                  href="/dashboard/agent-aim"
                >
                  Dashboard
                </NextLink>
              </li>
            )}
            {siteConfig.navItems
              .filter((item) => !(pathname?.startsWith("/login") && item.href === "/" || pathname?.startsWith("/signup") && item.href === "/"))
              .map((item) => (
              <li key={item.href}>
                <NextLink
                  className={clsx(
                    "text-foreground hover:text-muted-foreground transition-colors",
                    "data-[active=true]:font-semibold",
                  )}
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <ThemeSwitch />
          <div className="hidden lg:flex ml-2">{searchInput}</div>
          <div className="hidden md:flex">
            {user ? (
              <Dropdown>
                <Dropdown.Trigger>
                  <Avatar
                    className="transition-transform"
                    color="default"
                    size="sm"
                  >
                    <Avatar.Image src={user.user_metadata?.avatar_url} />
                    <Avatar.Fallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu aria-label="Profile Actions">
                    <Dropdown.Item key="profile" className="h-14 gap-2">
                      <p className="font-semibold">Signed in as</p>
                      <p className="font-semibold text-foreground">{user.email}</p>
                    </Dropdown.Item>
                    <Dropdown.Item key="settings">My Settings</Dropdown.Item>
                    <Dropdown.Item key="help">Help & Feedback</Dropdown.Item>
                    <Dropdown.Item
                      key="logout"
                      className="text-danger"
                      onPress={handleLogout}
                    >
                      Log Out
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : (
              <div className="flex gap-2">
                <NextLink href="/login" passHref legacyBehavior>
                  <Button className="text-sm font-normal" variant="secondary">
                    Sign In
                  </Button>
                </NextLink>
                <NextLink href="/login?mode=signup" passHref legacyBehavior>
                  <Button className="text-sm font-semibold rounded-xl" variant="primary">
                    Sign Up
                  </Button>
                </NextLink>
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:hidden items-center gap-2">
          <ThemeSwitch />
          <button
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
            className="p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ) : (
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="border-t border-divider sm:hidden">
          <div className="p-4">{searchInput}</div>
          <ul className="flex flex-col gap-2 px-4 pb-4">
            {user && (
              <li>
                <NextLink
                  className="block py-2 text-lg no-underline text-foreground font-medium"
                  href="/dashboard/agent-aim"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </NextLink>
              </li>
            )}
            {siteConfig.navMenuItems.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <Link
                  className={clsx(
                    "block py-2 text-lg no-underline",
                    index === siteConfig.navMenuItems.length - 1
                      ? "text-danger"
                      : "text-foreground",
                  )}
                  href="#"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};
