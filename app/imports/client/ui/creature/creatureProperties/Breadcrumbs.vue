<template lang="html">
  <div
    class="breadcrumbs layout align-center wrap"
    :class="{'no-icons': noIcons}"
  >
    <span
      v-if="noLinks"
    >
      <v-icon>
        mdi-account
      </v-icon>
    </span>
    <a
      v-else
      data-id="breadcrumb-root"
      @click="clickRootCreature"
    >
      <v-icon color="accent">
        mdi-account
      </v-icon>
    </a> 
    <template v-for="(prop, index) in props">
      <v-icon
        :key="index"
      >
        mdi-chevron-right
      </v-icon>
      <span
        v-if="noLinks"
        :key="prop._id"
      >
        <tree-node-view
          :model="prop"
          class="breadcrumb-tree-node-view"
        />
      </span>
      <a
        v-else
        :key="prop._id"
        :data-id="`breadcrumb-${prop._id}`"
        @click="click(prop._id)"
      >
        <tree-node-view
          :model="prop"
          class="breadcrumb-tree-node-view"
        />
      </a>
    </template>
  </div>
</template>

<script lang="js">
  import fetchDocByRef from '/imports/api/parenting/fetchDocByRef.js';
  import TreeNodeView from '/imports/client/ui/properties/treeNodeViews/TreeNodeView.vue';

  export default {
    components: {
      TreeNodeView,
    },
    props: {
      model: {
        type: Object,
        required: true,
      },
      noLinks: Boolean,
      noIcons: Boolean,
      editing: Boolean,
    },
    computed:{
      props(){
        return this.model.ancestors
          .slice(1)
          .map(ref => fetchDocByRef(ref))
          .filter(prop => prop.type !== 'propertySlot');
      },
    },
    methods: {
      click(id){
        const store = this.$store;
        // Check if there is a dialog open for this doc already
        let dialogFound;
        let dialogsToPop = 0;
        store.state.dialogStack.dialogs.forEach(dialog => {
          if (dialog.data && dialog.data._id === id){
            dialogFound = true;
            dialogsToPop = 0;
          } else {
            dialogsToPop += 1;
          }
        });
        if (dialogFound){
          // Pop dialogs until we get to it
          store.dispatch('popDialogStacks', dialogsToPop);
        } else {
          // Otherwise open it as a new dialog
          store.commit('pushDialogStack', {
            component: 'creature-property-dialog',
            elementId: `breadcrumb-${id}`,
            data: {
              _id: id,
              startInEditTab: this.editing,
            },
          });
        }
      },
      clickRootCreature() {
        const store = this.$store;
        // Check if there is a dialog open for this doc already
        let dialogFound;
        let dialogsToPop = 0;
        store.state.dialogStack.dialogs.forEach(dialog => {
          if (dialog.component === 'creature-root-dialog'){
            dialogFound = true;
            dialogsToPop = 0;
          } else {
            dialogsToPop += 1;
          }
        });
        if (dialogFound){
          // Pop dialogs until we get to it
          store.dispatch('popDialogStacks', dialogsToPop);
        } else {
          // Otherwise open it as a new dialog
          store.commit('pushDialogStack', {
            component: 'creature-root-dialog',
            elementId: 'breadcrumb-root',
            data: {
              _id: this.model.ancestors[0].id,
              startInEditTab: this.editing,
            },
          });
        }
      }
    }
  }
</script>

<style lang="css" scoped>
.breadcrumbs {
  margin-bottom: 16px;
  opacity: 0.8;
}
.no-icons {

}
</style>

<style lang="css">
  .no-icons .breadcrumb-tree-node-view .v-icon {
    display: none;
  }
</style>
