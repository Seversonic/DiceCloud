<template lang="html">
  <dialog-base
    :color="model.color"
    dark-body
  >
    <template slot="toolbar">
      <v-toolbar-title>
        {{ model.name }}
      </v-toolbar-title>
      <v-spacer />
      <v-text-field
        v-model="searchInput"
        prepend-inner-icon="mdi-magnify"
        regular
        clearable
        hide-details
        class="flex-grow-0"
        style="flex-basis: 300px;"
        :loading="searchLoading"
        @change="searchValue = searchInput || undefined"
        @click:clear="searchValue = undefined"
      />
    </template>
    <property-description
      text
      :string="model.description"
    />
    <p>
      <property-tags
        v-for="(tags, index) in tagsSearched.or"
        :key="index"
        :tags="tags"
        :prefix="index ? 'OR' : undefined"
      />
      <property-tags
        v-for="(tags, index) in tagsSearched.not"
        :key="index"
        :tags="tags"
        prefix="NOT"
      />
    </p>
    <v-expansion-panels
      multiple
      inset
    >
      <template v-for="libraryNode in libraryNodes">
        <v-expansion-panel
          v-if="showDisabled || !libraryNode._disabledBySlotFillerCondition"
          :key="libraryNode._id"
          :model="libraryNode"
          :data-id="libraryNode._id"
          :class="{disabled: isDisabled(libraryNode)}"
        >
          <v-expansion-panel-header>
            <template #default="{ open }">
              <v-layout
                align-center
                class="flex-grow-0 mr-2"
              >
                <v-checkbox
                  v-if="libraryNode._disabledByAlreadyAdded"
                  class="my-0 py-0"
                  hide-details
                  :input-value="true"
                  disabled
                />
                <v-checkbox
                  v-else
                  v-model="selectedNodeIds"
                  class="my-0 py-0"
                  hide-details
                  :disabled="isDisabled(libraryNode)"
                  :value="libraryNode._id"
                  @click.stop
                />
              </v-layout>
              <v-layout column>
                <v-layout align-center>
                  <tree-node-view :model="libraryNode" />
                  <div
                    v-if="libraryNode._disabledBySlotFillerCondition"
                    class="error--text text-no-wrap text-truncate"
                  >
                    {{ libraryNode.slotFillerCondition }}
                  </div>
                </v-layout>
                <div class="text-caption text-no-wrap text-truncate">
                  {{ libraryNames[libraryNode.ancestors[0].id ] }}
                </div>
              </v-layout>
              <div
                v-if="libraryNode.slotQuantityFilled !== undefined && libraryNode.slotQuantityFilled !== 1"
                class="text-overline flex-grow-0 text-no-wrap"
                :class="{
                  'error--text': isDisabled(libraryNode) &&
                    libraryNode._disabledByQuantityFilled
                }"
              >
                {{ libraryNode.slotQuantityFilled }} slots
              </div>
              <template v-if="open">
                <v-btn
                  icon
                  class="flex-grow-0"
                  @click.stop="openPropertyDetails(libraryNode._id)"
                >
                  <v-icon>mdi-window-restore</v-icon>
                </v-btn>
              </template>
            </template>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <library-node-expansion-content :model="libraryNode" />
          </v-expansion-panel-content>
        </v-expansion-panel>
      </template>
    </v-expansion-panels>
    <v-layout
      v-if="(!$subReady.classFillers && !searchValue) || currentLimit < countAll"
      column
      align-center
      justify-center
      class="ma-3"
    >
      <v-btn
        :loading="!$subReady.classFillers"
        color="accent"
        @click="loadMore"
      >
        Load More
      </v-btn>
    </v-layout>
    <template v-if="!showDisabled && disabledNodeCount">
      <v-layout
        column
        align-center
        justify-center
        class="ma-3"
      >
        <div>
          Requirements of {{ disabledNodeCount }} properties were not met
        </div>
        <v-btn
          class="mt-2"
          elevation="0"
          color="accent"
          @click="showDisabled = true"
        >
          Show All
        </v-btn>
      </v-layout>
    </template>
    <template slot="actions">
      <v-btn
        text
        @click="$store.dispatch('popDialogStack')"
      >
        Cancel
      </v-btn>
      <v-spacer />
      <v-btn
        text
        color="primary"
        :disabled="!dummySlot && !selectedNodeIds.length"
        @click="$store.dispatch('popDialogStack', selectedNodeIds)"
      >
        <template v-if="model.spaceLeft">
          {{ totalQuantitySelected }} / {{ model.spaceLeft }}
        </template>
        <template v-if="classId">
          Insert
        </template>
        <template v-else>
          Close Test
        </template>
      </v-btn>
    </template>
  </dialog-base>
</template>

<script lang="js">
import CreatureVariables from '/imports/api/creature/creatures/CreatureVariables.js';
import CreatureProperties from '/imports/api/creature/creatureProperties/CreatureProperties.js';
import LibraryNodes from '/imports/api/library/LibraryNodes.js';
import DialogBase from '/imports/client/ui/dialogStack/DialogBase.vue';
import TreeNodeView from '/imports/client/ui/properties/treeNodeViews/TreeNodeView.vue';
import PropertyDescription from '/imports/client/ui/properties/viewers/shared/PropertyDescription.vue'
import resolve, { toString } from '/imports/parser/resolve.js';
import { prettifyParseError, parse } from '/imports/parser/parser.js';
// import evaluateString from '/imports/api/creature/computation/afterComputation/evaluateString.js';
import getSlotFillFilter from '/imports/api/creature/creatureProperties/methods/getSlotFillFilter.js'
import Libraries from '/imports/api/library/Libraries.js';
import LibraryNodeExpansionContent from '/imports/client/ui/library/LibraryNodeExpansionContent.vue';
import PropertyTags from '/imports/client/ui/properties/viewers/shared/PropertyTags.vue';
import { clone } from 'lodash';

export default {
  components: {
    DialogBase,
    TreeNodeView,
    PropertyDescription,
    LibraryNodeExpansionContent,
    PropertyTags,
  },
  props: {
    classId: {
      type: String,
      default: undefined,
    },
    creatureId: {
      type: String,
      default: undefined,
    },
    dummySlot: {
      type: Object,
      default: undefined,
    },
  },
  data() {
    return {
      selectedNodeIds: [],
      searchInput: undefined,
      searchValue: undefined,
      showDisabled: false,
      disabledNodeCount: undefined,
    }
  },
  reactiveProvide: {
    name: 'context',
    include: ['creatureId'],
  },
  computed: {
    tagsSearched() {
      let or = [];
      let not = [];
      if (this.model.slotTags && this.model.slotTags.length) {
        or.push(this.model.slotTags);
      }
      this.model.extraTags?.forEach(extras => {
        if (extras.tags?.length) {
          if (extras.operation === 'OR') {
            or.push(extras.tags);
          } else if (extras.operation === 'NOT') {
            not.push(extras.tags);
          }
        }
      });
      return { or, not };
    },
  },
  methods: {
    loadMore() {
      if (this.currentLimit >= this.countAll) return;
      this._subs['classFillers'].setData('limit', this.currentLimit + 50);
    },
    openPropertyDetails(id) {
      this.$store.commit('pushDialogStack', {
        component: 'library-node-dialog',
        elementId: id,
        data: {
          _id: id,
        },
      });
    },
    isDisabled(node) {
      return node._disabledBySlotFillerCondition ||
        node._disabledByAlreadyAdded ||
        (
          node._disabledByQuantityFilled &&
          !this.selectedNodeIds.includes(node._id)
        )
    },
  },
  meteor: {
    $subscribe: {
      'classFillers'() {
        return [this.classId, this.searchValue || undefined]
      },
    },
    searchLoading() {
      return !!this.searchValue && !this.$subReady.classFillers;
    },
    model() {
      if (this.classId) {
        return CreatureProperties.findOne(this.classId);
      } else if (this.dummySlot) {
        let model = clone(this.dummySlot)
        if (!model.quantityExpected) model.quantityExpected = {};
        model.quantityExpected.value = +model.quantityExpected.calculation;
        model.spaceLeft = model.quantityExpected.value;
        return model;
      }
    },
    variables() {
      if (!this.creatureId) return {};
      return CreatureVariables.findOne({ _creatureId: this.creatureId }) || {};
    },
    currentLimit() {
      return this._subs['classFillers'].data('limit') || 50;
    },
    countAll() {
      return this._subs['classFillers'].data('countAll');
    },
    alreadyAdded() {
      let added = new Set();
      if (!this.model.unique) return added;
      let ancestorId;
      if (this.model.unique === 'uniqueInSlot') {
        ancestorId = this.model._id;
      } else if (this.model.unique === 'uniqueInCreature') {
        ancestorId = this.creatureId;
      }
      CreatureProperties.find({
        'ancestors.id': ancestorId,
        libraryNodeId: { $exists: true },
        removed: { $ne: true },
      }, {
        fields: { libraryNodeId: 1 },
      }).forEach(prop => {
        added.add(prop.libraryNodeId);
      });
      return added;
    },
    totalQuantitySelected() {
      let quantitySelected = 0;
      LibraryNodes.find({
        _id: { $in: this.selectedNodeIds }
      }, {
        fields: { slotQuantityFilled: 1 },
      }).forEach(node => {
        if (Number.isFinite(node.slotQuantityFilled)) {
          quantitySelected += node.slotQuantityFilled;
        } else {
          quantitySelected += 1;
        }
      });
      return quantitySelected;
    },
    spaceLeft() {
      if (!this.model.quantityExpected || this.model.quantityExpected.value === 0) return undefined;
      return this.model.spaceLeft - this.totalQuantitySelected;
    },
    libraryNames() {
      let names = {};
      Libraries.find().forEach(lib => names[lib._id] = lib.name)
      return names;
    },
    libraryNodes() {
      let filter = getSlotFillFilter({ slot: this.model });
      let nodes = LibraryNodes.find(filter, {
        sort: { name: 1, order: 1 }
      }).fetch();
      let disabledNodeCount = 0;
      // Mark classFillers whose condition isn't met or are too big to fit
      // the quantity to fill
      nodes.forEach(node => {
        if (node.slotFillerCondition) {
          try {
            let parseNode = parse(node.slotFillerCondition);
            const { result: resultNode } = resolve('reduce', parseNode, this.variables);
            if (resultNode?.parseType === 'constant') {
              if (!resultNode.value) {
                node._disabledBySlotFillerCondition = true;
                disabledNodeCount += 1;
              }
            } else {
              node._disabledBySlotFillerCondition = true;
              node._conditionError = toString(resultNode);
              disabledNodeCount += 1;
            }
          } catch (e) {
            console.warn(e);
            let error = prettifyParseError(e);
            node._disabledBySlotFillerCondition = true;
            node._conditionError = error;
            disabledNodeCount += 1;
          }
        }
        let quantityToFill = node.type === 'slotFiller' ? node.slotQuantityFilled : 1;
        if (
          quantityToFill > this.spaceLeft
        ) {
          node._disabledByQuantityFilled = true;
        }
        if (this.alreadyAdded.has(node._id)) {
          node._disabledByAlreadyAdded = true;
        }
      });
      this.disabledNodeCount = disabledNodeCount;
      return nodes;
    },
  }
}
</script>

<style lang="css" scoped>
.disabled {
  opacity: 0.7;
}
</style>
