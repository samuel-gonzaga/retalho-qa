import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUG_CATALOG,
  BUG_IDS,
  isBugOn,
  isQaPanelEnabled,
  listBugs,
  parseBugList,
  resetBugOverrides,
  setActiveBugs,
  setBugOverride,
  type BugId,
} from '@/domain/bugs'

// RNF-01: defeitos intencionais ligados só por RETALHO_BUGS ou pela área /qa/defeitos.
describe('RNF-01 · mecanismo de defeitos', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetBugOverrides()
  })

  it('cataloga exatamente os 7 defeitos, com IDs de 1 a 7', () => {
    expect(BUG_IDS).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(BUG_CATALOG.map((bug) => bug.id)).toEqual([...BUG_IDS])
  })

  it('deixa todos os defeitos desligados por padrão', () => {
    vi.stubEnv('RETALHO_BUGS', undefined)
    for (const id of BUG_IDS) expect(isBugOn(id)).toBe(false)
  })

  it('liga somente os defeitos listados em RETALHO_BUGS', () => {
    vi.stubEnv('RETALHO_BUGS', '1,3,5')
    const ligados = BUG_IDS.filter((id) => isBugOn(id))
    expect(ligados).toEqual([1, 3, 5])
  })

  it.each([
    ['', []],
    ['2', [2]],
    [' 2 , 4 ', [2, 4]],
    ['7,7,7', [7]],
    ['0,8,-1', []],
    ['3.5,x,,6', [6]],
  ])('interpreta RETALHO_BUGS="%s" como %j', (raw, esperado) => {
    expect([...parseBugList(raw)].sort()).toEqual(esperado)
  })

  it('rejeita consulta a defeito inexistente', () => {
    expect(() => isBugOn(8 as BugId)).toThrow(RangeError)
  })

  it('permite ligar e desligar em tempo de execução, acima do valor do ambiente', () => {
    vi.stubEnv('RETALHO_BUGS', '2')
    setBugOverride(4, true)
    setBugOverride(2, false)
    expect(isBugOn(4)).toBe(true)
    expect(isBugOn(2)).toBe(false)
  })

  it('define o conjunto exato de defeitos ligados', () => {
    vi.stubEnv('RETALHO_BUGS', '1,2')
    setActiveBugs([6])
    expect(BUG_IDS.filter((id) => isBugOn(id))).toEqual([6])
  })

  it('volta ao valor do ambiente ao restaurar', () => {
    vi.stubEnv('RETALHO_BUGS', '3')
    setActiveBugs([])
    resetBugOverrides()
    expect(isBugOn(3)).toBe(true)
  })

  it('informa a origem do estado de cada defeito', () => {
    vi.stubEnv('RETALHO_BUGS', '1')
    setBugOverride(2, true)
    const porId = new Map(listBugs().map((bug) => [bug.id, bug]))
    expect(porId.get(1)).toMatchObject({ active: true, source: 'env' })
    expect(porId.get(2)).toMatchObject({ active: true, source: 'runtime' })
    expect(porId.get(3)).toMatchObject({ active: false, source: 'default' })
  })

  it.each([
    ['development', undefined, true],
    ['test', undefined, true],
    ['production', undefined, false],
    ['production', '1', true],
  ])(
    'área de QA com NODE_ENV=%s e RETALHO_QA_PAINEL=%s: liberada = %s',
    (env, painel, esperado) => {
      vi.stubEnv('NODE_ENV', env)
      vi.stubEnv('RETALHO_QA_PAINEL', painel)
      expect(isQaPanelEnabled()).toBe(esperado)
    },
  )
})
