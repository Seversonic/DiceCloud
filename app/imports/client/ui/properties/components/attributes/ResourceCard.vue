<template lang="html">
  <v-card
    class="resource-card"
    :class="hover ? 'elevation-8': ''"
  >
    <resource-card-content
      :model="model"
      :hover="hover"
      @mouseover="hover = true"
      @mouseleave="hover = false"
      @click="$emit('click')"
      @change="e => $emit('change', e)"
    />
    <card-highlight :active="hover" />
  </v-card>
</template>

<script lang="js">
import CardHighlight from '/imports/client/ui/components/CardHighlight.vue';
import ResourceCardContent from '/imports/client/ui/properties/components/attributes/ResourceCardContent.vue';

export default {
  components: {
    CardHighlight,
    ResourceCardContent,
  },
  inject: {
    context: { default: {} }
  },
  props: {
    model: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      hover: false,
    }
  },
};
</script>

<style lang="css">
.resource-card {
  transition: box-shadow .4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.resource-card > div {
  padding-top: 16px;
  padding-bottom: 16px;
}
</style>
