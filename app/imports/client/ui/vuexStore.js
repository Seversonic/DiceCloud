import Vue from 'vue';
import Vuex from 'vuex';
import dialogStackStore from '/imports/client/ui/dialogStack/dialogStackStore.js';
import Creatures from '/imports/api/creature/creatures/Creatures.js';
const tabs = ['stats', 'features', 'actions', 'spells', 'inventory', 'journal', 'build', 'tree'];
const tabsWithoutSpells = ['stats', 'features', 'actions', 'inventory', 'journal', 'build', 'tree'];

Vue.use(Vuex);
const store = new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    dialogStack: dialogStackStore,
  },
  state: {
    drawer: undefined,
    rightDrawer: undefined,
    pageTitle: undefined,
    characterSheetTabs: {},
    showDetailsDialog: false,
  },
  getters: {
    tabById: (state) => (id) => {
      return state.characterSheetTabs[id] ?? 0;
    },
    tabNameById: (state) => (id) => {
      const tabNumber = state.characterSheetTabs[id] ?? 0;
      const creature = Creatures.findOne(id);
      if (creature?.settings?.hideSpellsTab) {
        return tabsWithoutSpells[tabNumber];
      } else {
        return tabs[tabNumber]
      }
    }
  },
  mutations: {
    toggleDrawer(state) {
      state.drawer = !state.drawer;
    },
    toggleRightDrawer(state) {
      state.rightDrawer = !state.rightDrawer;
    },
    setDrawer(state, value) {
      state.drawer = value;
    },
    setRightDrawer(state, value) {
      state.rightDrawer = value;
    },
    setPageTitle(state, value) {
      state.pageTitle = value;
      document.title = value;
    },
    setTabForCharacterSheet(state, { tab, id }) {
      Vue.set(state.characterSheetTabs, id, tab);
    },
    setShowDetailsDialog(state, value) {
      state.showDetailsDialog = value;
    },
  },
});

export default store;
