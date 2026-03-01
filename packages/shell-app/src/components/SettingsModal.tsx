/**
 * SettingsModal — shell-owned settings UI for all sub-apps.
 *
 * Replaces the per-app settings modals that previously lived inside each
 * client application (see ADR-0011). One Carbon Modal, one tab per app type,
 * settings dispatched to the shared Redux store on every change.
 *
 * Sub-apps read their settings via `useAppSelector(s => s.settings.<app>)`
 * — no prop-drilling needed because Module Federation shares the Redux
 * singleton across the shell and all remotes.
 */

import {
  Modal,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Select,
  SelectItem,
  Toggle,
  TextInput,
} from '@carbon/react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  updateCvBuilderSettings,
  updateTripPlannerSettings,
  updateBlogEngineSettings,
  updatePurefoySettings,
  type CvBuilderSettings,
  type TripPlannerSettings,
} from '../store/slices/settingsSlice.js'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch()
  const { cvBuilder, tripPlanner, blogEngine, purefoy } = useAppSelector(s => s.settings)

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Settings"
      passiveModal
      size="md"
    >
      <Tabs>
        <TabList aria-label="App settings">
          <Tab>CV Builder</Tab>
          <Tab>Trip Planner</Tab>
          <Tab>Blog Engine</Tab>
          <Tab>Purefoy</Tab>
        </TabList>

        <TabPanels>
          {/* ── CV Builder ─────────────────────────────────────────── */}
          <TabPanel>
            <div className="settings-panel">
              <Select
                id="cv-default-template"
                labelText="Default template"
                value={cvBuilder.defaultTemplate}
                onChange={e =>
                  dispatch(updateCvBuilderSettings({
                    defaultTemplate: e.target.value as CvBuilderSettings['defaultTemplate'],
                  }))
                }
              >
                <SelectItem value="modern" text="Modern" />
                <SelectItem value="classic" text="Classic" />
                <SelectItem value="minimal" text="Minimal" />
              </Select>

              <Select
                id="cv-export-format"
                labelText="Export format"
                value={cvBuilder.exportFormat}
                onChange={e =>
                  dispatch(updateCvBuilderSettings({
                    exportFormat: e.target.value as CvBuilderSettings['exportFormat'],
                  }))
                }
              >
                <SelectItem value="pdf" text="PDF" />
                <SelectItem value="docx" text="Word (.docx)" />
              </Select>

              <Select
                id="cv-language"
                labelText="Language"
                value={cvBuilder.language}
                onChange={e =>
                  dispatch(updateCvBuilderSettings({
                    language: e.target.value as CvBuilderSettings['language'],
                  }))
                }
              >
                <SelectItem value="en" text="English" />
                <SelectItem value="fr" text="French" />
                <SelectItem value="de" text="German" />
                <SelectItem value="es" text="Spanish" />
              </Select>
            </div>
          </TabPanel>

          {/* ── Trip Planner ────────────────────────────────────────── */}
          <TabPanel>
            <div className="settings-panel">
              <Select
                id="trip-currency"
                labelText="Default currency"
                value={tripPlanner.defaultCurrency}
                onChange={e =>
                  dispatch(updateTripPlannerSettings({
                    defaultCurrency: e.target.value as TripPlannerSettings['defaultCurrency'],
                  }))
                }
              >
                <SelectItem value="USD" text="USD – US Dollar" />
                <SelectItem value="EUR" text="EUR – Euro" />
                <SelectItem value="GBP" text="GBP – British Pound" />
                <SelectItem value="JPY" text="JPY – Japanese Yen" />
              </Select>

              <Select
                id="trip-distance-unit"
                labelText="Distance unit"
                value={tripPlanner.distanceUnit}
                onChange={e =>
                  dispatch(updateTripPlannerSettings({
                    distanceUnit: e.target.value as TripPlannerSettings['distanceUnit'],
                  }))
                }
              >
                <SelectItem value="km" text="Kilometres" />
                <SelectItem value="miles" text="Miles" />
              </Select>

              <Select
                id="trip-budget-category"
                labelText="Default budget category"
                value={tripPlanner.defaultBudgetCategory}
                onChange={e =>
                  dispatch(updateTripPlannerSettings({
                    defaultBudgetCategory: e.target.value as TripPlannerSettings['defaultBudgetCategory'],
                  }))
                }
              >
                <SelectItem value="budget" text="Budget" />
                <SelectItem value="mid-range" text="Mid-range" />
                <SelectItem value="luxury" text="Luxury" />
              </Select>
            </div>
          </TabPanel>

          {/* ── Blog Engine ─────────────────────────────────────────── */}
          <TabPanel>
            <div className="settings-panel">
              <TextInput
                id="blog-notion-api-url"
                labelText="Notion integration URL"
                value={blogEngine.notionApiUrl}
                onChange={e =>
                  dispatch(updateBlogEngineSettings({ notionApiUrl: e.target.value }))
                }
                placeholder="https://api.notion.com/v1/..."
              />

              <TextInput
                id="blog-default-author"
                labelText="Default author"
                value={blogEngine.defaultAuthor}
                onChange={e =>
                  dispatch(updateBlogEngineSettings({ defaultAuthor: e.target.value }))
                }
                placeholder="Your name"
              />

              <Toggle
                id="blog-auto-publish"
                labelText="Auto-publish drafts"
                toggled={blogEngine.autoPublish}
                onToggle={checked =>
                  dispatch(updateBlogEngineSettings({ autoPublish: checked }))
                }
              />
            </div>
          </TabPanel>

          {/* ── Purefoy ─────────────────────────────────────────────── */}
          <TabPanel>
            <div className="settings-panel">
              <TextInput
                id="purefoy-api-endpoint"
                labelText="API endpoint override"
                value={purefoy.apiEndpoint}
                onChange={e =>
                  dispatch(updatePurefoySettings({ apiEndpoint: e.target.value }))
                }
                placeholder="https://..."
              />

              <Toggle
                id="purefoy-debug-panel"
                labelText="Show debug panel"
                toggled={purefoy.showDebugPanel}
                onToggle={checked =>
                  dispatch(updatePurefoySettings({ showDebugPanel: checked }))
                }
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Modal>
  )
}
