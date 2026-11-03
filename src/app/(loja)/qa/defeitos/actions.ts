'use server'

import { revalidatePath } from 'next/cache'
import {
  isBugId,
  isQaPanelEnabled,
  resetBugOverrides,
  setActiveBugs,
  setBugOverride,
} from '@/domain/bugs'

function assertPanelEnabled() {
  if (!isQaPanelEnabled()) throw new Error('A área de QA não está disponível neste ambiente.')
}

// Um defeito muda o comportamento de várias telas: invalida todas.
function refreshAllPages() {
  revalidatePath('/', 'layout')
}

export async function toggleBug(formData: FormData) {
  assertPanelEnabled()
  const id = Number(formData.get('id'))
  if (!isBugId(id)) throw new Error('Defeito inexistente.')
  setBugOverride(id, formData.get('active') === 'true')
  refreshAllPages()
}

export async function turnOffAllBugs() {
  assertPanelEnabled()
  setActiveBugs([])
  refreshAllPages()
}

export async function restoreEnvBugs() {
  assertPanelEnabled()
  resetBugOverrides()
  refreshAllPages()
}
