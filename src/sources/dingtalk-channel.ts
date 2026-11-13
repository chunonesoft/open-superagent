/** DingTalk outbound channel: replies through the conversation's session webhook while it lives, and through the robot API after. */
import { threadKey, type OutboundMessage } from '../core/index.ts'
import { CliError } from '../infra/commands.ts'
import { checkedImText } from '../infra/text.ts'
import { SOURCE, dingtalkTriggerId, replyTitle } from './dingtalk-trigger.ts'
import type { SourceContext } from './host.ts'
import type { ChannelLink } from './kind.ts'

/**
 * What the robot API says when a send can never reach its conversation, in the words the CLI reports (DingTalk's error code and
 * message). One wording was measured: a send to an `openConversationId` that names no conversation answers HTTP 400 with
 * `invalid.openConversationId: 无效的openConversationId`. The other two are expected and not measured: the robot removed from a group,
 * and a group dissolved. If DingTalk words either differently, the send is retried like any failure until this expression, the one
 * place that reads the words, is adjusted.
 */
const LEFT = new RegExp([
  // Measured.
  'invalid\\.openConversationId',
  // Expected: the robot removed from a group, and a group dissolved.
  'not (in|a member of) (the |this )?(conversation|group|chat)',
  '(conversation|group|chat)(id)? (does not exist|doesn\'t exist|not found|(is|was|has been) dissolved|no longer exists)',
  'notIn(conversation|group|chat)', '(conversation|group|chat)Not(exist|found)'].join('|'), 'i')
/**
 * True when the robot API refuses a send because the conversation ID is invalid, the robot left the conversation or the conversation is
 * gone, which no retry fixes. Anything else may pass, so it is no reason to drop the reply: a network error, a throttle, a token that
 * expired, or a refusal about something else all carry no such words, and a failure with no HTTP status (the CLI never got an answer) is
 * never one.
 */
const gone = (error: unknown): boolean =>
  error instanceof CliError && error.code !== undefined && [400, 403, 404].includes(error.code) && LEFT.test(error.message)
/**
 * True when the robot API refuses a direct send because DingTalk does not know the person: `dingtalk-bot` reports a staff ID that comes
 * back in `invalidStaffIdList` as HTTP 400 with these words. The staff ID came from DingTalk itself, so no retry will make it known.
 */
const unknownPerson = (error: unknown): boolean =>
  error instanceof CliError && error.code === 400 && /does not know the person/i.test(error.message)

/**
 * The variable `dingtalk-bot message send --webhook-env` reads the session webhook from. The CLI's own constant is not imported: the CLI
 * is a separate entry that imports nothing of the package, and the bundle must not share a chunk with it. A test keeps the two equal.
 */
export const WEBHOOK_VARIABLE = 'DINGTALK_BOT_WEBHOOK'
/** The most buttons a reply's card shows: more links than this stay in its text only. */
export const MAX_REPLY_BUTTONS = 3
/** A Markdown link, or a bare address that ends before whitespace, a bracket, a quote or full-width punctuation. */
const LINK = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()[\]"'`，。、；：！？「」（）]+)/g
const CJK = /[\u3400-\u9fff]/
/** The label of a link to a pull request, merge request or Issue, in the reply's language, or nothing for any other page. */
function knownLabel(url: string, zh: boolean): string | undefined {
  const view = zh ? '查看' : 'View'
  const { pathname } = new URL(url)
  const mr = /\/-\/merge_requests\/(\d+)\/?$/.exec(pathname)
  if (mr) return `${view} MR !${mr[1]}`
  const pull = /\/pull\/(\d+)\/?$/.exec(pathname)
  if (pull) return `${view} PR #${pull[1]}`
  const issue = /\/(?:-\/)?issues\/(\d+)\/?$/.exec(pathname)
  return issue ? `${view} Issue #${issue[1]}` : undefined
}
/**
 * The buttons of the card a reply is sent as: one per distinct link, in the order of the text, at most MAX_REPLY_BUTTONS. A pull request,
 * merge request or Issue is labelled by its number; another link keeps its Markdown label or opens as a plain link. A reply without a
 * link has none, and stays a Markdown message: a card would only make an acknowledgement louder.
 */
export function replyButtons(text: string): { title: string; url: string }[] {
  const zh = CJK.test(text)
  const buttons: { title: string; url: string }[] = []
  for (const match of text.matchAll(LINK)) {
    const url = (match[2] ?? match[3]!).replace(/[.,;:!?]+$/, '')
    if (!URL.canParse(url) || buttons.some(button => button.url === url)) continue
    const label = (knownLabel(url, zh) ?? (match[1]?.trim() || (zh ? '打开链接' : 'Open link'))).replaceAll('=', '-')
    buttons.push({ title: label.length > 20 ? `${label.slice(0, 19)}…` : label, url })
    if (buttons.length === MAX_REPLY_BUTTONS) break
  }
  return buttons
}
/** Whether the address names a session webhook that has not yet expired. */
const live = (address: Record<string, string>): boolean => !!address.webhook && Number(address.expires) > Date.now()

/**
 * Replies in the conversation the target message came from, titled with the Thread's marker so that a quote of the reply finds the
 * Thread again; a reply with links goes as an ActionCard with a button per link (see `replyButtons`). A live session webhook is tried first, as it can mention the sender of a Markdown reply; if it fails for any reason, or has expired, the robot
 * API sends instead, and only its answer decides `gone`, but for a direct chat it cannot reach: one whose sender has no staff ID. Neither has an idempotency key: a send whose answer was lost may be sent twice.
 */
export async function sendDingtalk(host: Pick<SourceContext, 'commands'>, message: OutboundMessage): Promise<'sent' | 'gone'> {
  const { address } = message.channel
  const { conversationId, thread, staffId } = address
  if (!conversationId || !thread) throw new Error('Missing DingTalk reply target')
  const text = checkedImText(message.text)
  const title = replyTitle(threadKey({ source: SOURCE, id: thread }))
  const direct = address.direct === 'true'
  const buttons = replyButtons(text).flatMap(button => ['--button', `${button.title}=${button.url}`])
  const send = (target: [string, string], extra: string[] = [], env?: Record<string, string>) =>
    host.commands.dingtalk(['message', 'send', ...target, '--title', title, '--text-stdin', ...buttons, ...extra], text, env)
  if (live(address)) {
    try {
      // Nobody needs a mention in a direct chat, a sender with no staff ID cannot be named, and a card mentions nobody.
      // The webhook answers anyone who holds it, so it goes in the CLI's environment, which other local users cannot read, not in its arguments.
      await send(['--conversation', conversationId], ['--webhook-env', ...!direct && staffId && !buttons.length ? ['--at', staffId] : []], { [WEBHOOK_VARIABLE]: address.webhook! })
      return 'sent'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      /* The webhook expired early or was refused; the robot API still reaches the conversation. */
    }
  }
  // A group is reached by its conversation, a direct chat by the person. A sender outside the organization has no staff ID, so once
  // the session webhook is gone nothing reaches that direct chat again, however often it is tried.
  if (direct && !staffId) return 'gone'
  try { await send(direct ? ['--user', staffId!] : ['--conversation', conversationId]) }
  catch (error) {
    if (gone(error) || (direct && unknownPerson(error))) return 'gone'
    throw error
  }
  return 'sent'
}
/** DingTalk offers no address for a conversation or a message, so the link is empty and only names the Trigger of the message. */
export const dingtalkLink = (address: Record<string, string>): ChannelLink => ({
  url: '', label: { zh: '钉钉消息', en: 'DingTalk message' }, ...address.messageId ? { triggerId: dingtalkTriggerId(address.messageId) } : {},
})
