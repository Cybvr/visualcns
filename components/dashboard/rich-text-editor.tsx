"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import { NodeSelection } from "@tiptap/pm/state"
import { Image } from "@tiptap/extension-image"
import StarterKit from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"

import { looksLikeMarkdown, markdownToHtml } from "@/lib/markdown"
import {
  Bold,
  Code2,
  EllipsisVertical,
  Heading,
  Heading2,
  Heading3,
  Italic,
  ImagePlus,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ImagePickerDialog } from "@/components/dashboard/image-picker-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ToolbarButton = {
  label: string
  icon: typeof Bold
  isActive?: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const BUTTONS: ToolbarButton[][] = [
  [
    {
      label: "Bold",
      icon: Bold,
      isActive: (editor) => editor.isActive("bold"),
      run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      isActive: (editor) => editor.isActive("italic"),
      run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      isActive: (editor) => editor.isActive("strike"),
      run: (editor) => editor.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      label: "Heading",
      icon: Heading2,
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subheading",
      icon: Heading3,
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      label: "Bulleted list",
      icon: List,
      isActive: (editor) => editor.isActive("bulletList"),
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Checklist",
      icon: ListChecks,
      isActive: (editor) => editor.isActive("taskList"),
      run: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      isActive: (editor) => editor.isActive("orderedList"),
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      isActive: (editor) => editor.isActive("blockquote"),
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
  ],
  [
    {
      label: "Table",
      icon: TableIcon,
      isActive: (editor) => editor.isActive("table"),
      run: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ],
  [
    { label: "Undo", icon: Undo2, run: (editor) => editor.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, run: (editor) => editor.chain().focus().redo().run() },
  ],
]

function linkHref(value: string): string | null {
  const input = value.trim()
  if (!input) return null
  if (input.startsWith("/") && !input.startsWith("//")) return input
  const href = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`
  try {
    const url = new URL(href)
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null
    if (url.protocol === "mailto:" && !url.pathname.includes("@")) return null
    return url.href
  } catch {
    return null
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  scrollable = false,
  compact = false,
  flat = false,
  borderless = false,
  allowHtml = false,
  contentHeader,
  contentFooter,
  documentLayout = false,
  aboveContent,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  scrollable?: boolean
  compact?: boolean
  flat?: boolean
  borderless?: boolean
  allowHtml?: boolean
  contentHeader?: ReactNode
  contentFooter?: ReactNode
  /**
   * Full-page writing layout: a sticky toolbar row, then `aboveContent`, then
   * the text on a white card. Used by the document editor.
   */
  documentLayout?: boolean
  aboveContent?: ReactNode
}) {
  // Referenced inside handlePaste, which runs long after the editor is built.
  const editorRef = useRef<Editor | null>(null)
  const [imageSelected, setImageSelected] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [linkEditingExisting, setLinkEditingExisting] = useState(false)
  const [linkHasSelection, setLinkHasSelection] = useState(false)
  const [linkError, setLinkError] = useState("")
  const linkSelectionRef = useRef<{ from: number; to: number }>({ from: 0, to: 0 })
  const [htmlMode, setHtmlMode] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, autolink: true, linkOnPaste: true } }), Image, TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { resizable: true } })],
    content: value,
    // Next renders this on the server first, and tiptap needs the DOM.
    immediatelyRender: false,
    editorProps: {
      // Pasted plain text that is really Markdown arrives as literal #, * and |,
      // so format it before it lands. Rich (text/html) pastes are left untouched.
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData
        if (!clipboard || clipboard.getData("text/html")) return false
        const text = clipboard.getData("text/plain")
        if (!text || !looksLikeMarkdown(text)) return false
        editorRef.current?.chain().focus().insertContent(markdownToHtml(text)).run()
        return true
      },
      attributes: {
        class: documentLayout ? cn(
          "doc-editor-content min-h-[50vh] break-words px-5 pb-8 pt-2 text-[1.0625rem] leading-8 text-foreground/80 outline-none cursor-text sm:px-8",
          "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-[1.75rem] [&_h1]:leading-9 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:leading-8 [&_h3]:mb-1 [&_h3]:mt-6 [&_h3]:text-lg [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>label]:mt-[0.4em] [&_ul[data-type=taskList]_li>label]:shrink-0 [&_ul[data-type=taskList]_li>div]:min-w-0 [&_ul[data-type=taskList]_li>div]:flex-1 [&_ul[data-type=taskList]_li[data-checked=true]>div]:text-muted-foreground [&_ul[data-type=taskList]_li[data-checked=true]>div]:line-through [&_ul[data-type=taskList]_li>div>p]:my-0 [&_input[type=checkbox]]:size-4 [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]]:accent-primary [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_img]:max-w-full [&_table]:my-4 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_.selectedCell]:bg-muted/60 [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring",
        ) : cn(
          compact ? "min-h-48 sm:min-h-64" : "min-h-64",
          "break-words px-4 py-3 text-sm outline-none",
          "cursor-text",
          "[&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_p]:leading-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:border-border",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>label]:mt-[0.4em] [&_ul[data-type=taskList]_li>label]:shrink-0 [&_ul[data-type=taskList]_li>div]:min-w-0 [&_ul[data-type=taskList]_li>div]:flex-1 [&_ul[data-type=taskList]_li[data-checked=true]>div]:text-muted-foreground [&_ul[data-type=taskList]_li[data-checked=true]>div]:line-through [&_ul[data-type=taskList]_li>div>p]:my-0 [&_input[type=checkbox]]:size-4 [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]]:accent-primary [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_img]:max-w-full [&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_.selectedCell]:bg-muted/60 [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring",
        ),
        "aria-label": placeholder || "Message",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    onSelectionUpdate: ({ editor: current }) => {
      const { selection } = current.state
      setImageSelected(selection instanceof NodeSelection && selection.node.type.name === "image")
    },
  })

  editorRef.current = editor

  // Content arriving after mount (an edit page finishing its load) has to be
  // pushed in, but only when it differs or the caret jumps on every keystroke.
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return <div className={cn("min-h-72", !borderless && "rounded-[10px] border border-input", className)} />
  }

  const currentEditor = editor

  function openLinkDialog() {
    const { from, to } = currentEditor.state.selection
    linkSelectionRef.current = { from, to }
    setLinkHasSelection(from !== to)
    setLinkEditingExisting(currentEditor.isActive("link"))
    setLinkUrl(currentEditor.getAttributes("link").href || "")
    setLinkText("")
    setLinkError("")
    setLinkDialogOpen(true)
  }

  function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const href = linkHref(linkUrl)
    if (!href) {
      setLinkError("Enter a valid web or email address.")
      return
    }

    const chain = currentEditor.chain().focus().setTextSelection(linkSelectionRef.current)
    const saved = linkHasSelection || linkEditingExisting
      ? chain.extendMarkRange("link").setLink({ href }).run()
      : chain.insertContent({ type: "text", text: linkText.trim() || href, marks: [{ type: "link", attrs: { href } }] }).run()
    if (!saved) {
      setLinkError("Couldn't insert that link. Check the URL and try again.")
      return
    }
    setLinkDialogOpen(false)
  }

  function removeLink() {
    currentEditor.chain().focus().setTextSelection(linkSelectionRef.current).extendMarkRange("link").unsetLink().run()
    setLinkDialogOpen(false)
  }

  function handleImageSelected({ src, alt }: { src: string; alt: string }) {
    if (!editor) return
    const { selection } = editor.state
    if (selection instanceof NodeSelection && selection.node.type.name === "image") {
      editor.view.dispatch(editor.state.tr.setNodeMarkup(selection.from, undefined, {
        ...selection.node.attrs,
        src,
        alt,
      }))
    } else {
      editor.chain().focus().setImage({ src, alt }).run()
    }
    onChange(editor.getHTML())
  }

  function toggleHtmlMode() {
    if (!allowHtml) return
    if (htmlMode) editorRef.current?.commands.setContent(value || "", { emitUpdate: false })
    setHtmlMode((current) => !current)
  }

  function renderToolbarButton(button: ToolbarButton) {
    const Icon = button.icon
    const active = button.isActive?.(currentEditor) ?? false
    return (
      <button
        key={button.label}
        type="button"
        onClick={() => button.run(currentEditor)}
        aria-label={button.label}
        aria-pressed={active}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    )
  }

  function renderLinkButton(large = false) {
    const active = currentEditor.isActive("link")
    const label = active ? "Edit link" : "Insert link"
    return (
      <button
        key="link"
        type="button"
        onClick={openLinkDialog}
        aria-label={label}
        title={label}
        aria-pressed={active}
        disabled={htmlMode}
        className={cn(
          "inline-flex shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
          large ? "size-10 rounded-lg" : "size-8 rounded-md",
          active ? large ? "bg-primary/10 text-primary" : "bg-muted text-foreground" : large ? "text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Link2 className={large ? "size-[18px]" : "size-4"} aria-hidden="true" />
      </button>
    )
  }

  const linkDialog = (
    <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{linkEditingExisting ? "Edit link" : "Insert link"}</DialogTitle>
          <DialogDescription>{linkHasSelection || linkEditingExisting ? "Add a destination for the selected text." : "Add a destination and optional display text."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={saveLink} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rich-text-link-url">Link URL</Label>
            <Input id="rich-text-link-url" autoFocus value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError("") }} placeholder="https://example.com" />
            {linkError && <p className="text-sm text-destructive" role="alert">{linkError}</p>}
          </div>
          {!linkHasSelection && !linkEditingExisting && (
            <div className="space-y-1.5">
              <Label htmlFor="rich-text-link-text">Display text</Label>
              <Input id="rich-text-link-text" value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="Defaults to the URL" />
            </div>
          )}
          <DialogFooter>
            {linkEditingExisting && <Button type="button" variant="outline" onClick={removeLink}>Remove link</Button>}
            <Button type="submit">{linkEditingExisting ? "Save link" : "Insert link"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  if (documentLayout) {
    const groups = [BUTTONS[0], [BUTTONS[1][0], ...BUTTONS[2].slice(0, 2)], BUTTONS[4]]
    const more = [BUTTONS[1][1], BUTTONS[2][2], ...BUTTONS[3]]
    return (
      <div className={cn("flex min-w-0 flex-col", className)}>
        <div className="sticky top-[var(--doc-editor-top,0px)] z-20 flex items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1.5 [scrollbar-width:none]">
          {groups.map((group, index) => (
            <div key={index} className={cn("flex shrink-0 items-center gap-1 pr-1", index < groups.length - 1 && "mr-1 border-r border-border")}>
              {group.map((button) => {
                const Icon = button.label === "Heading" ? Heading : button.icon
                const active = button.isActive?.(currentEditor) ?? false
                return (
                  <button
                    key={button.label}
                    type="button"
                    onClick={() => button.run(currentEditor)}
                    aria-label={button.label}
                    title={button.label}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </button>
                )
              })}
              {index === 0 && renderLinkButton(true)}
            </div>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More formatting tools" title="More formatting tools" className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <EllipsisVertical className="size-[18px]" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {more.map((button) => {
                const Icon = button.icon
                return <DropdownMenuItem key={button.label} onSelect={() => button.run(editor)}><Icon aria-hidden="true" /><span>{button.label}</span></DropdownMenuItem>
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setImageDialogOpen(true)}><ImagePlus aria-hidden="true" /><span>{imageSelected ? "Replace image" : "Insert image"}</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ImagePickerDialog open={imageDialogOpen} onOpenChange={setImageDialogOpen} onSelect={handleImageSelected} />
        {linkDialog}
        <div className="space-y-3 bg-card px-3 py-4 sm:px-6">
          {aboveContent}
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            {contentHeader}
            <EditorContent editor={editor} />
            {contentFooter}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex min-h-0 flex-col overflow-hidden bg-background",
      borderless ? "rounded-none border-0" : flat ? "rounded-none border-x-0 border-t-0 border-b border-input" : "rounded-[10px] border border-input",
      className,
    )}>
      <div className={cn("flex min-w-0 items-center gap-1 px-2 py-1.5", !borderless && "border-b border-input")}>
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          {(BUTTONS[0] ?? []).map(renderToolbarButton)}
          {renderLinkButton()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More formatting tools" title="More formatting tools" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <EllipsisVertical className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {BUTTONS.slice(1).flat().map((button) => {
                const Icon = button.icon
                return <DropdownMenuItem key={button.label} onSelect={() => button.run(editor)}><Icon aria-hidden="true" /><span>{button.label}</span></DropdownMenuItem>
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setImageDialogOpen(true)}><ImagePlus aria-hidden="true" /><span>{imageSelected ? "Replace image" : "Insert image"}</span></DropdownMenuItem>
              {allowHtml && <DropdownMenuItem onSelect={toggleHtmlMode}><Code2 aria-hidden="true" /><span>{htmlMode ? "Use visual editor" : "Edit HTML"}</span></DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
          {BUTTONS.map((group, index) => (
            <div key={index} className="flex shrink-0 items-center gap-1 [&:not(:last-child)]:mr-1">
              {group.map(renderToolbarButton)}
              {index === 0 && renderLinkButton()}
            </div>
          ))}
          <div className={cn("flex shrink-0 items-center gap-1 pl-1", !borderless && "border-l border-input")}>
            <button type="button" onClick={() => setImageDialogOpen(true)} aria-label={imageSelected ? "Replace image" : "Insert image"} title={imageSelected ? "Replace image" : "Insert image"} className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", imageSelected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <ImagePlus className="size-4" aria-hidden="true" />
            </button>
          </div>
          {allowHtml && <button type="button" onClick={toggleHtmlMode} aria-label={htmlMode ? "Use visual editor" : "Edit HTML"} aria-pressed={htmlMode} title={htmlMode ? "Use visual editor" : "Edit HTML"} className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", htmlMode ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Code2 className="size-4" aria-hidden="true" /></button>}
        </div>
      </div>
      <ImagePickerDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onSelect={handleImageSelected}
      />
      {linkDialog}
      <div className={cn(
        "min-h-0 overflow-x-auto",
        scrollable && "flex-1 overflow-y-auto",
        htmlMode && "flex flex-1 flex-col overflow-hidden",
      )}>
        {!htmlMode && contentHeader}
        {htmlMode ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Edit the email HTML"
            aria-label="Email HTML source"
            spellCheck={false}
            className={cn(
              "min-h-0 flex-1 resize-none border-0 bg-transparent px-4 py-3 font-mono text-xs leading-6 text-foreground outline-none",
              compact ? "min-h-48 sm:min-h-64" : "min-h-64",
            )}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
        {!htmlMode && contentFooter}
      </div>
    </div>
  )
}
