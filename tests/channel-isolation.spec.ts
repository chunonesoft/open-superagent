/**
 * Channel isolation: every message of a ticket that started in one chat Source goes back to that Source only. A DingTalk
 * ticket on an installation that also runs Feishu sends its acknowledgement, result and pull-request end notice through
 * `dingtalk-bot`, and never through the Feishu bot.
 */
import { afterEach, expect, it, vi } from 'vitest'
import { Commands } from '../src/infra/commands.ts'
import { dingtalkKind } from '../src/sources/dingtalk.ts'
import { dingtalkTrigger } from '../src/sources/dingtalk-trigger.ts'
import { startRuntime, type Host } from './fixtures/host.ts'

const CONVERSATION = 'cidGroupOne=='
const STAFF = 'staff-1'
let h: Host | undefined
afterEach(async () => { await h?.stop(); h = undefined })

/** A mention of the robot from the allowed staff member in the listened DingTalk group. */
const dingtalkMessage = (id: string, text: string) => dingtalkTrigger({ msgId: id, conversationId: CONVERSATION, conversationType: '2',
  chatbotUserId: 'robot', senderId: '$:opaque', senderStaffId: STAFF, isInAtList: true, text: { content: text },
  createAt: Date.parse('2026-11-03T19:38:28Z') }, { rootOf: () => undefined, markedThread: () => undefined })!

/** The Feishu sends (`im` commands) among the bot CLI's calls; reads such as the member sync are not sends. */
const feishuSends = () => vi.mocked(Commands.prototype.lark).mock.calls.filter(([args]) => args[0] === 'im')

it('sends every message of a DingTalk ticket to its DingTalk conversation and none to Feishu', async () => {
  h = await startRuntime()
  const dingtalk = vi.spyOn(Commands.prototype, 'dingtalk').mockResolvedValue({})
  h.runtime.sources.register(dingtalkKind)
  const settings = h.runtime.store.settings()
  h.runtime.store.saveSettings({ ...settings,
    sources: { ...settings.sources, dingtalk: { enabled: true, config: { cli: 'dingtalk-bot', chats: [{ chatId: CONVERSATION }] } } },
    policy: { ...settings.policy, sources: { ...settings.policy.sources, dingtalk: { allowed: [{ id: STAFF }] } } } })
  vi.mocked(Commands.prototype.lark).mockClear()

  const { ticket, sessionId } = await h.acceptedTicket(dingtalkMessage('msg-1', '官网页脚改成 © 2026 xsky，改完提个 PR'))
  expect(ticket.channels.map(channel => channel.source)).toEqual(['dingtalk'])
  await h.runTool(sessionId, 'orchestrator_ack', { trigger_id: ticket.origin.triggerId, text: '收到：改官网页脚。' })
  h.runtime.engine.bindThread(ticket.id, { source: 'github', id: '1' }, true)
  await h.runTool(sessionId, 'orchestrator_report', { state: 'ready', summary: 'Done' })
  await h.runTool(h.runtime.masterId, 'orchestrator_reply', { purpose: 'result', ticket_id: ticket.id, text: '页脚已改好：PR #1。' })
  // A ticket that ends with its pull request tells every conversation of the ticket, which here is the DingTalk one alone.
  h.runtime.engine.threadClosed({ source: 'github', id: '1' }, 'merged', '2026-11-03T19:47:00Z')
  await h.runtime.idle(); await h.runtime.sendReplies()

  const receipts = h.runtime.store.db.prepare("SELECT value FROM outbox WHERE value ->> '$.ticketId' = ?").all(ticket.id)
    .map(row => JSON.parse(String(row.value)) as { kind: string; status: string; channel: { source: string } })
  expect(receipts.map(receipt => receipt.kind).sort()).toEqual(['acknowledgement', 'notice', 'reply'])
  expect(receipts.map(receipt => [receipt.channel.source, receipt.status])).toEqual(receipts.map(() => ['dingtalk', 'sent']))
  expect(dingtalk.mock.calls.map(([args]) => args.slice(0, 2))).toEqual(receipts.map(() => ['message', 'send']))
  expect(feishuSends()).toEqual([])
})
