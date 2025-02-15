<template>
  <div class="sidebar">
    <v-layout
      v-if="!signedIn"
      justify-center
    >
      <v-btn
        text
        to="/sign-in"
      >
        Sign in
      </v-btn>
    </v-layout>
    <v-list>
      <v-list-item v-if="signedIn">
        <v-list-item-content>
          <v-list-item-title>
            {{ userName }}
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-tooltip bottom>
            <template #activator="{ on }">
              <v-btn
                icon
                to="/account"
                v-on="on"
              >
                <v-icon>mdi-cog</v-icon>
              </v-btn>
            </template>
            <span>Account Settings</span>
          </v-tooltip>
        </v-list-item-action>
      </v-list-item>

      <v-list-item
        v-for="(link, i) in links"
        :key="i"
        :to="link.to"
        :href="link.href"
      >
        <v-list-item-action>
          <v-icon>{{ link.icon }}</v-icon>
        </v-list-item-action>
        <v-list-item-title>
          {{ link.title }}
        </v-list-item-title>
        <v-icon v-if="link.href">
          mdi-open-in-new
        </v-icon>
      </v-list-item>
      <v-divider />
    </v-list>
    <creature-folder-list
      dense
      :creatures="CreaturesWithNoParty"
      :folders="folders"
    />
  </div>
</template>

<script lang="js">
import Creatures from '/imports/api/creature/creatures/Creatures.js';
import CreatureFolders from '/imports/api/creature/creatureFolders/CreatureFolders.js';
import CreatureFolderList from '/imports/client/ui/creature/creatureList/CreatureFolderList.vue';
import getCreatureUrlName from '/imports/api/creature/creatures/getCreatureUrlName.js';
import { uniq, flatten } from 'lodash';

const characterTransform = function (char) {
  char.url = `/character/${char._id}/${getCreatureUrlName(char)}`;
  char.initial = char.name && char.name[0] || '?';
  return char;
};
export default {
  components: {
    CreatureFolderList
  },
  meteor: {
    $subscribe: {
      'characterList': [],
    },
    signedIn() {
      return Meteor.userId();
    },
    userName() {
      let user = Meteor.user();
      return user && user.username || user && user._id;
    },
    links() {
      let isLoggedIn = !!Meteor.userId();
      let links = [
        { title: 'Home', icon: 'mdi-home', to: '/' },
        { title: 'Characters', icon: 'mdi-account-group', to: '/characterList', requireLogin: true },
        { title: 'Library', icon: 'mdi-library-shelves', to: '/library', requireLogin: true },
        //{title: 'Tabletops', icon: 'api', to: '/tabletops', requireLogin: true},
        //{title: 'Friends', icon: 'people', to: '/friends', requireLogin: true},
        { title: 'Files', icon: 'mdi-file-multiple', to: '/my-files' },
        { title: 'Feedback', icon: 'mdi-bug', to: '/feedback' },
        { title: 'About', icon: 'mdi-sign-text', to: '/about' },
        { title: 'Documentation', icon: 'mdi-book-open-variant', to: '/docs' },
        { title: 'Patreon', icon: 'mdi-patreon', href: 'https://www.patreon.com/dicecloud' },
        { title: 'Github', icon: 'mdi-github', href: 'https://github.com/ThaumRystra/DiceCloud/tree/version-2' },
      ];
      return links.filter(link => !link.requireLogin || isLoggedIn);
    },
    folders() {
      const userId = Meteor.userId();
      let folders = CreatureFolders.find(
        { owner: userId, archived: { $ne: true } },
        { sort: { order: 1 } },
      ).map(folder => {
        folder.creatures = Creatures.find(
          {
            _id: { $in: folder.creatures || [] },
            $or: [{ readers: userId }, { writers: userId }, { owner: userId }],
          }, {
          sort: { name: 1 },
        }
        ).map(characterTransform);
        return folder;
      });
      folders = folders.filter(folder => !!folder.creatures.length);
      return folders;
    },
    CreaturesWithNoParty() {
      var userId = Meteor.userId();
      var charArrays = CreatureFolders.find({ owner: userId }).map(p => p.creatures);
      var folderChars = uniq(flatten(charArrays));
      return Creatures.find(
        {
          _id: { $nin: folderChars },
          $or: [{ readers: userId }, { writers: userId }, { owner: userId }],
        },
        { sort: { name: 1 } }
      ).map(characterTransform);
    },
  },
};
</script>
