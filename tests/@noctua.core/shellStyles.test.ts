import { afterEach, describe, expect, it } from 'vitest'
import { disableShellStylesheets } from '@/@noctua.core/theme/shellStyles'

const addLink = (href: string, rel = 'stylesheet'): HTMLLinkElement => {
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  document.head.appendChild(link)
  return link
}

describe('disableShellStylesheets', () => {
  afterEach(() => {
    document.head.innerHTML = ''
  })

  it("disables the Noctua shell's stylesheets", () => {
    const shell = [
      addLink('/bootstrap.min.css'),
      addLink('/jquery-ui-1.10.3.custom.min.css'),
      addLink('/bbop.css'),
      addLink('https://noctua.geneontology.org/amigo.css?v=2'),
    ]

    const disabled = disableShellStylesheets()

    expect(disabled).toEqual(shell)
    shell.forEach(link => expect(link.disabled).toBe(true))
  })

  it('leaves other stylesheets alone', () => {
    const others = [
      addLink('/assets/css/index-abc123.css'),
      addLink('/noctua_common.css'),
      addLink('/my-bootstrap-theme.css'),
      addLink('/bootstrap.min.css', 'preload'),
    ]

    expect(disableShellStylesheets()).toEqual([])
    // jsdom leaves `disabled` undefined until it's set.
    others.forEach(link => expect(link.disabled).not.toBe(true))
  })
})
