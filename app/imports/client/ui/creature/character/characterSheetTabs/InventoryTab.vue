<template lang="html">
  <div class="inventory">
    <column-layout wide-columns>
      <folder-group-card
        v-for="folder in startFolders"
        :key="folder._id"
        :model="folder"
        @click-property="clickProperty"
        @sub-click="_id => clickTreeProperty({_id})"
        @remove="softRemove"
      />
      <div>
        <v-card>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon>$vuetify.icons.injustice</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>
                  Weight Carried
                </v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-list-item-title>
                  {{ weightCarried }} lb
                </v-list-item-title>
              </v-list-item-action>
            </v-list-item>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon>$vuetify.icons.cash</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>
                  Net worth
                </v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-list-item-title>
                  <coin-value :value="variables && variables.valueTotal && variables.valueTotal.value|| 0" />
                </v-list-item-title>
              </v-list-item-action>
            </v-list-item>
            <v-list-item v-if="variables && variables.itemsAttuned && variables.itemsAttuned.value">
              <v-list-item-avatar>
                <v-icon>$vuetify.icons.spell</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>
                  Items attuned
                </v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-list-item-title>
                  {{ variables.itemsAttuned.value }}
                </v-list-item-title>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-card>
      </div>
      <div>
        <toolbar-card transparent-toolbar>
          <v-toolbar-title slot="toolbar">
            Equipped
          </v-toolbar-title>
          <v-card-text class="px-0">
            <item-list
              equipment
              :items="equippedItems"
              :parent-ref="equipmentParentRef"
            />
          </v-card-text>
        </toolbar-card>
      </div>
      <div>
        <toolbar-card transparent-toolbar>
          <v-toolbar-title slot="toolbar">
            Carried
          </v-toolbar-title>
          <v-card-text class="px-0">
            <item-list
              :items="carriedItems"
              :parent-ref="carriedParentRef"
            />
          </v-card-text>
        </toolbar-card>
      </div>
      <div
        v-for="container in containersWithoutAncestorContainers"
        :key="container._id"
      >
        <container-card :model="container" />
      </div>
      <folder-group-card
        v-for="folder in endFolders"
        :key="folder._id"
        :model="folder"
        @click-property="clickProperty"
        @sub-click="_id => clickTreeProperty({_id})"
        @remove="softRemove"
      />
    </column-layout>
  </div>
</template>

<script lang="js">
import CreatureProperties from '/imports/api/creature/creatureProperties/CreatureProperties.js';
import Creatures from '/imports/api/creature/creatures/Creatures.js';
import ColumnLayout from '/imports/client/ui/components/ColumnLayout.vue';
import ContainerCard from '/imports/client/ui/properties/components/inventory/ContainerCard.vue';
import ToolbarCard from '/imports/client/ui/components/ToolbarCard.vue';
import ItemList from '/imports/client/ui/properties/components/inventory/ItemList.vue';
import getParentRefByTag from '/imports/api/creature/creatureProperties/methods/getParentRefByTag.js';
import BUILT_IN_TAGS from '/imports/constants/BUILT_IN_TAGS.js';
import CoinValue from '/imports/client/ui/components/CoinValue.vue';
import stripFloatingPointOddities from '/imports/api/engine/computation/utility/stripFloatingPointOddities.js';
import CreatureVariables from '/imports/api/creature/creatures/CreatureVariables.js';
import tabFoldersMixin from '/imports/client/ui/properties/components/folders/tabFoldersMixin.js';

export default {
  components: {
    ColumnLayout,
    ContainerCard,
    ToolbarCard,
    ItemList,
    CoinValue,
  },
  mixins: [tabFoldersMixin],
  props: {
    creatureId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      organize: false,
      tabName: 'inventory',
    };
  },
  meteor: {
    folderIds() {
      return CreatureProperties.find({
        'ancestors.id': this.creatureId,
        type: 'folder',
        hideStatsGroup: true,
        removed: { $ne: true },
        inactive: { $ne: true },
      }, { fields: { _id: 1 } }).map(folder => folder._id);
    },
    containers() {
      return CreatureProperties.find({
        'ancestors.id': {
          $eq: this.creatureId,
          $nin: this.folderIds,
        },
        type: 'container',
        removed: { $ne: true },
        inactive: { $ne: true },
      }, {
        sort: { order: 1 },
      });
    },
    creature() {
      return Creatures.findOne(this.creatureId, {
        fields: {
          color: 1,
          variables: 1,
        }
      });
    },
    variables() {
      return CreatureVariables.findOne({ _creatureId: this.creatureId }) || {};
    },
    containersWithoutAncestorContainers() {
      return CreatureProperties.find({
        'ancestors.id': {
          $eq: this.creatureId,
          $nin: [...this.containerIds, ...this.folderIds],
        },
        type: 'container',
        removed: { $ne: true },
        inactive: { $ne: true },
      }, {
        sort: { order: 1 },
      });
    },
    carriedItems() {
      return CreatureProperties.find({
        'ancestors.id': {
          $eq: this.creatureId,
          $nin: [...this.containerIds, ...this.folderIds],
        },
        type: 'item',
        equipped: { $ne: true },
        removed: { $ne: true },
        deactivatedByAncestor: { $ne: true },
      }, {
        sort: { order: 1 },
      });
    },
    equippedItems() {
      return CreatureProperties.find({
        'ancestors.id': {
          $eq: this.creatureId,
        },
        type: 'item',
        equipped: true,
        removed: { $ne: true },
        inactive: { $ne: true },
      }, {
        sort: { order: 1 },
      });
    },
    equipmentParentRef() {
      return getParentRefByTag(
        this.creatureId, BUILT_IN_TAGS.equipment
      ) || getParentRefByTag(
        this.creatureId, BUILT_IN_TAGS.inventory
      ) || {
        id: this.creatureId,
        collection: 'creatures'
      };
    },
    carriedParentRef() {
      return getParentRefByTag(
        this.creatureId, BUILT_IN_TAGS.carried
      ) || getParentRefByTag(
        this.creatureId, BUILT_IN_TAGS.inventory
      ) || {
        id: this.creatureId,
        collection: 'creatures'
      };
    },
  },
  computed: {
    containerIds() {
      return this.containers.map(container => container._id);
    },
    weightCarried() {
      return stripFloatingPointOddities(
        this.variables &&
        this.variables.weightCarried &&
        this.variables.weightCarried.value || 0
      );
    },
  },
}
</script>

<style lang="css" scoped>

</style>
