import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Bold,
  Calendar as CalendarIcon,
  CreditCard,
  FileText,
  Inbox,
  Info,
  Italic,
  LogOut,
  Settings,
  Smile,
  User,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Code, CodeBlock } from "@/components/ui/code";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Group } from "@/components/ui/group";
import { Heading } from "@/components/ui/heading";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Prose } from "@/components/ui/prose";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Stack } from "@/components/ui/stack";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { toast, ToastProvider } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ThemeToggle } from "@/components/theme-toggle";

export function meta() {
  return [
    { title: "Components — PRIZM 4.0" },
    {
      name: "description",
      content: "A live gallery of every PRIZM component used in this project.",
    },
  ];
}

/**
 * A single component demo: a titled card wrapping a live, interactive preview.
 * The preview row wraps so multiple variants sit comfortably side by side.
 */
function Demo({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">{children}</CardContent>
    </Card>
  );
}

/** A titled group of demos with an anchor for the in-page navigation. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Heading as="h2" size="xl" className="mb-1">
        {title}
      </Heading>
      <Separator className="mb-5" />
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

const SECTIONS = [
  { id: "actions", label: "Actions" },
  { id: "forms", label: "Forms" },
  { id: "data-display", label: "Data display" },
  { id: "layout", label: "Layout" },
  { id: "feedback", label: "Feedback" },
  { id: "navigation", label: "Navigation" },
  { id: "overlay", label: "Overlay" },
  { id: "typography", label: "Typography" },
] as const;

const FRUITS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Mango", "Orange", "Peach"];

function SliderDemo() {
  const [value, setValue] = useState(40);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <Label>Volume</Label>
        <Text as="span" size="sm" variant="muted">
          {value}
        </Text>
      </div>
      <Slider
        value={value}
        onValueChange={(v) => setValue(Array.isArray(v) ? v[0] : v)}
        className="w-full"
      />
    </div>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(2);
  const total = 5;
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage((p) => Math.max(1, p - 1));
            }}
          />
        </PaginationItem>
        {[1, 2, 3].map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href="#"
              isActive={page === n}
              onClick={(e) => {
                e.preventDefault();
                setPage(n);
              }}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            isActive={page === total}
            onClick={(e) => {
              e.preventDefault();
              setPage(total);
            }}
          >
            {total}
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage((p) => Math.min(total, p + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function Components() {
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 10);
  }, []);
  return (
    <TooltipProvider delay={300}>
      <ToastProvider>
        <div className="min-h-screen bg-bg text-fg">
          {/* Page header */}
          <header className="border-b border-border bg-bg/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <div>
                <Heading as="h1" size="2xl">
                  PRIZM components
                </Heading>
                <Text size="sm" variant="muted" className="mt-0.5">
                  A live gallery of every component used in this project.
                </Text>
              </div>
              <ThemeToggle />
            </div>
            {/* In-page category navigation */}
            <nav className="mx-auto max-w-6xl px-6 pb-3">
              <Group gap="1" wrap className="text-sm">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-md px-2.5 py-1 text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
                  >
                    {s.label}
                  </a>
                ))}
              </Group>
            </nav>
          </header>

          <main className="mx-auto max-w-6xl space-y-16 px-6 py-10">
            {/* ----------------------------------------------------------------- Actions */}
            <Section id="actions" title="Actions">
              <Demo title="Button" description="Six variants, four sizes.">
                <Button>Solid</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="link">Link</Button>
              </Demo>
              <Demo title="Button sizes">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Settings">
                  <Settings />
                </Button>
                <Button disabled>Disabled</Button>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Forms */}
            <Section id="forms" title="Forms">
              <Demo title="Input">
                <Input placeholder="you@example.com" type="email" className="w-full" />
              </Demo>
              <Demo title="Textarea">
                <Textarea placeholder="Write a message…" rows={3} className="w-full" />
              </Demo>
              <Demo title="Checkbox">
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" defaultChecked />
                  <Label htmlFor="terms">Accept terms &amp; conditions</Label>
                </div>
              </Demo>
              <Demo title="Switch">
                <div className="flex items-center gap-2">
                  <Switch id="notify" defaultChecked />
                  <Label htmlFor="notify">Enable notifications</Label>
                </div>
              </Demo>
              <Demo title="Radio Group">
                <RadioGroup defaultValue="standard">
                  {[
                    ["standard", "Standard delivery"],
                    ["express", "Express delivery"],
                    ["pickup", "Collect in store"],
                  ].map(([value, label]) => (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem id={value} value={value} />
                      <Label htmlFor={value}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </Demo>
              <Demo title="Select">
                <Select defaultValue="apple">
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                    <SelectItem value="mango">Mango</SelectItem>
                  </SelectContent>
                </Select>
              </Demo>
              <Demo title="Combobox" description="Searchable select with typeahead.">
                <Combobox items={FRUITS}>
                  <ComboboxInput placeholder="Search fruit…" className="w-56" />
                  <ComboboxContent>
                    <ComboboxEmpty>No fruit found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Demo>
              <Demo title="Slider">
                <SliderDemo />
              </Demo>
              <Demo title="Field" description="Label, control, hint and error wired together.">
                <Field className="w-full">
                  <FieldLabel>Email address</FieldLabel>
                  <FieldControl
                    required
                    type="email"
                    render={<Input placeholder="you@example.com" />}
                  />
                  <FieldDescription>We&apos;ll never share your email.</FieldDescription>
                  <FieldError />
                </Field>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Data display */}
            <Section id="data-display" title="Data display">
              <Demo title="Badge" description="Seven semantic tones.">
                <Badge variant="solid">Solid</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="subtle">Subtle</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
              </Demo>
              <Demo title="Avatar">
                <Avatar size="sm">
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>MD</AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarImage src="/broken.png" alt="" />
                  <AvatarFallback>LG</AvatarFallback>
                </Avatar>
                <Avatar size="xl">
                  <AvatarFallback>XL</AvatarFallback>
                </Avatar>
              </Demo>
              <Demo title="Table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Ada Lovelace", "Engineer", "Active"],
                      ["Alan Turing", "Researcher", "Active"],
                      ["Grace Hopper", "Admiral", "Away"],
                    ].map(([name, role, status]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{role}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={status === "Active" ? "success" : "subtle"}>
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Demo>
              <Demo title="Calendar">
                <Calendar />
              </Demo>
              <Demo title="Kbd" description="Keyboard shortcut display.">
                <span className="flex items-center gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>P</Kbd>
                </span>
              </Demo>
              <Demo title="Code" description="Inline and block.">
                <div className="w-full space-y-3">
                  <Text size="sm">
                    Run <Code>pnpm dev</Code> to start the server.
                  </Text>
                  <CodeBlock>{`function greet(name: string) {\n  return \`Hello, \${name}\`;\n}`}</CodeBlock>
                </div>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Layout */}
            <Section id="layout" title="Layout">
              <Demo title="Card">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Project overview</CardTitle>
                    <CardDescription>A container with structured slots.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text size="sm" variant="muted">
                      Cards group related content and actions on a raised surface.
                    </Text>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">View</Button>
                  </CardFooter>
                </Card>
              </Demo>
              <Demo title="Separator" description="Horizontal and vertical dividers.">
                <div className="w-full">
                  <Text size="sm">Above</Text>
                  <Separator className="my-3" />
                  <div className="flex h-6 items-center gap-3">
                    <Text size="sm">Left</Text>
                    <Separator orientation="vertical" />
                    <Text size="sm">Right</Text>
                  </div>
                </div>
              </Demo>
              <Demo title="Stack" description="Equal-gap vertical column.">
                <Stack gap="2" className="w-full">
                  <div className="rounded-md bg-bg-muted px-3 py-2 text-sm">Item one</div>
                  <div className="rounded-md bg-bg-muted px-3 py-2 text-sm">Item two</div>
                  <div className="rounded-md bg-bg-muted px-3 py-2 text-sm">Item three</div>
                </Stack>
              </Demo>
              <Demo title="Group" description="Equal-gap horizontal row.">
                <Group gap="2" wrap>
                  <Button size="sm" variant="outline">
                    One
                  </Button>
                  <Button size="sm" variant="outline">
                    Two
                  </Button>
                  <Button size="sm" variant="outline">
                    Three
                  </Button>
                </Group>
              </Demo>
              <Demo
                title="Frame"
                description="Constrained, centered page container (shown bordered)."
              >
                <div className="w-full rounded-md border border-dashed border-border">
                  <div className="mx-auto max-w-md px-6 py-6 text-center">
                    <Text size="sm" variant="muted">
                      Frame centers content within a max-width and applies consistent padding.
                    </Text>
                  </div>
                </div>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Feedback */}
            <Section id="feedback" title="Feedback">
              <Demo title="Alert">
                <div className="w-full space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Heads up</AlertTitle>
                    <AlertDescription>This is a default informational alert.</AlertDescription>
                  </Alert>
                  <Alert variant="danger">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>Your changes could not be saved.</AlertDescription>
                  </Alert>
                </div>
              </Demo>
              <Demo title="Toast" description="Transient notification.">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.add({
                      title: "Changes saved",
                      description: "Your preferences have been updated.",
                      type: "success",
                    })
                  }
                >
                  Show toast
                </Button>
              </Demo>
              <Demo title="Progress">
                <Progress value={66} className="w-full" />
              </Demo>
              <Demo title="Spinner">
                <Spinner size="sm" />
                <Spinner />
                <Spinner size="lg" />
                <Spinner size="xl" />
              </Demo>
              <Demo title="Skeleton" description="Loading placeholder.">
                <div className="flex w-full items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </Demo>
              <Demo title="Empty State">
                <EmptyState
                  className="w-full"
                  icon={<Inbox className="h-6 w-6" />}
                  title="No messages"
                  description="When you receive messages they will appear here."
                  action={<Button size="sm">Compose</Button>}
                />
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Navigation */}
            <Section id="navigation" title="Navigation">
              <Demo title="Tabs">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <Text size="sm" variant="muted">
                      A summary of recent activity and key metrics.
                    </Text>
                  </TabsContent>
                  <TabsContent value="activity">
                    <Text size="sm" variant="muted">
                      A chronological feed of events.
                    </Text>
                  </TabsContent>
                  <TabsContent value="settings">
                    <Text size="sm" variant="muted">
                      Manage your preferences here.
                    </Text>
                  </TabsContent>
                </Tabs>
              </Demo>
              <Demo title="Breadcrumb">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#">Library</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Components</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </Demo>
              <Demo title="Pagination">
                <PaginationDemo />
              </Demo>
              <Demo title="Navigation Menu">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="w-56 p-2">
                          {["Analytics", "Automation", "Reporting"].map((item) => (
                            <li key={item}>
                              <NavigationMenuLink
                                href="#"
                                className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg"
                              >
                                {item}
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        href="#"
                        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-fg-muted hover:bg-bg-muted hover:text-fg"
                      >
                        Docs
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </Demo>
              <Demo title="Command" description="Command palette with fuzzy search.">
                <Command className="w-full rounded-lg border border-border">
                  <CommandInput placeholder="Type a command or search…" />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Calendar
                      </CommandItem>
                      <CommandItem>
                        <Smile className="mr-2 h-4 w-4" />
                        Search emoji
                      </CommandItem>
                      <CommandItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                        <CommandShortcut>⌘P</CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                        <CommandShortcut>⌘B</CommandShortcut>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Overlay */}
            <Section id="overlay" title="Overlay">
              <Demo title="Dialog">
                <Dialog>
                  <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm deletion</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete the item.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline">Cancel</Button>} />
                      <Button variant="danger">Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Demo>
              <Demo title="Sheet" description="Edge-anchored sliding panel.">
                <Sheet>
                  <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Edit profile</SheetTitle>
                      <SheetDescription>Update your details, then save.</SheetDescription>
                    </SheetHeader>
                    <SheetBody>
                      <div className="space-y-2">
                        <Label htmlFor="sheet-name">Name</Label>
                        <Input id="sheet-name" defaultValue="Ada Lovelace" />
                      </div>
                    </SheetBody>
                    <SheetFooter>
                      <SheetClose render={<Button variant="outline">Cancel</Button>} />
                      <SheetClose render={<Button>Save</Button>} />
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </Demo>
              <Demo title="Popover">
                <Popover>
                  <PopoverTrigger render={<Button variant="outline">Open popover</Button>} />
                  <PopoverContent>
                    <PopoverHeader>
                      <PopoverTitle>Dimensions</PopoverTitle>
                      <PopoverDescription>Set the layout dimensions.</PopoverDescription>
                    </PopoverHeader>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Width" />
                      <Input placeholder="Height" />
                    </div>
                  </PopoverContent>
                </Popover>
              </Demo>
              <Demo title="Tooltip">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="icon" aria-label="More information">
                        <Info />
                      </Button>
                    }
                  />
                  <TooltipContent>Helpful contextual hint</TooltipContent>
                </Tooltip>
              </Demo>
              <Demo title="Menu">
                <Menu>
                  <MenuTrigger render={<Button variant="outline">Open menu</Button>} />
                  <MenuContent>
                    <MenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </MenuItem>
                    <MenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                      <MenuShortcut>⌘,</MenuShortcut>
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </Demo>
              <Demo title="Context Menu" description="Right-click to open.">
                <ContextMenu>
                  <ContextMenuTrigger className="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-fg-muted">
                    Right-click here
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>Back</ContextMenuItem>
                    <ContextMenuItem>Reload</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem>Inspect</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </Demo>
              <Demo title="Hover Card" description="Rich preview on hover.">
                <HoverCard>
                  <HoverCardTrigger render={<Button variant="link">@prizm</Button>} />
                  <HoverCardContent>
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarFallback>Pz</AvatarFallback>
                      </Avatar>
                      <div>
                        <Text weight="semibold" size="sm">
                          PRIZM
                        </Text>
                        <Text size="sm" variant="muted">
                          A DSTA design system for C3 and enterprise products.
                        </Text>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Typography */}
            <Section id="typography" title="Typography">
              <Demo title="Heading" description="Display and section headings.">
                <div className="w-full space-y-1">
                  <Heading size="4xl">Heading 4xl</Heading>
                  <Heading size="2xl">Heading 2xl</Heading>
                  <Heading size="lg">Heading lg</Heading>
                  <Heading size="md">Heading md</Heading>
                </div>
              </Demo>
              <Demo title="Text" description="Body text primitive.">
                <div className="w-full space-y-1">
                  <Text size="lg">Large body text</Text>
                  <Text>Default body text</Text>
                  <Text variant="muted">Muted body text</Text>
                  <Text variant="subtle" size="sm">
                    Subtle small text
                  </Text>
                </div>
              </Demo>
              <Demo title="Prose" description="Long-form styled content.">
                <Prose>
                  <h3>Getting started</h3>
                  <p>
                    Prose styles raw HTML — headings, paragraphs, lists and links — with PRIZM
                    defaults.
                  </p>
                  <ul>
                    <li>Readable line length and rhythm</li>
                    <li>Consistent heading sizes</li>
                  </ul>
                </Prose>
              </Demo>
            </Section>

            {/* ----------------------------------------------------------------- Footnote */}
            <footer className="border-t border-border pt-8">
              <Stack gap="3">
                <Heading as="h2" size="lg">
                  Not shown here
                </Heading>
                <Text size="sm" variant="muted" className="max-w-2xl">
                  This gallery covers the full PRIZM <Code>ui</Code> library — the components
                  appropriate for this project&apos;s <Code>enterprise</Code> zone. Two things are
                  deliberately excluded:
                </Text>
                <ul className="ml-5 list-disc space-y-1 text-sm text-fg-muted">
                  <li>
                    <Text as="span" size="sm" weight="medium">
                      Link
                    </Text>{" "}
                    — PRIZM&apos;s <Code>Link</Code> wraps <Code>next/link</Code>, which isn&apos;t
                    available in this React Router project, so importing it would break the build.
                    Use React Router&apos;s own <Code>Link</Code> for navigation.
                  </li>
                  <li>
                    <Text as="span" size="sm" weight="medium">
                      RC3 robotics organisms
                    </Text>{" "}
                    — these belong to the C3 robotics pack (<Code>data-pack=&quot;rc3&quot;</Code>)
                    and only render correctly in the C3 zone. Tell me if you&apos;d like a separate
                    C3 gallery for them.
                  </li>
                </ul>
                <div className="flex items-center gap-2 pt-2 text-fg-muted">
                  <Bell className="h-4 w-4" />
                  <FileText className="h-4 w-4" />
                  <Bold className="h-4 w-4" />
                  <Italic className="h-4 w-4" />
                  <Text as="span" size="xs" variant="subtle">
                    Icons: lucide-react at stroke-width 1.5
                  </Text>
                </div>
              </Stack>
            </footer>
          </main>
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}
