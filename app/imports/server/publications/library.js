import SimpleSchema from 'simpl-schema';
import Libraries from '/imports/api/library/Libraries.js';
import LibraryCollections from '/imports/api/library/LibraryCollections.js';
import LibraryNodes from '/imports/api/library/LibraryNodes.js';
import { assertViewPermission, assertDocViewPermission } from '/imports/api/sharing/sharingPermissions.js';
import { union } from 'lodash';

const LIBRARY_NODE_TREE_FIELDS = {
  _id: 1,
  name: 1,
  type: 1,
  icon: 1,
  color: 1,
  order: 1,
  parent: 1,
  ancestors: 1,
  tags: 1,
  slotFillerCondition: 1,
  removed: 1,
  removedAt: 1,
  // Actions
  actionType: 1,
  // SlotFillers
  slotQuantityFilled: 1,
  slotFillerType: 1,
  // Effect
  operation: 1,
  targetTags: 1,
  stats: 1,
  // Item
  quantity: 1,
  plural: 1,
  equipped: 1,
  // Branch
  branchType: 1,
  // Damage:
  damageType: 1,
  stat: 1,
  amount: 1,
  // Class level
  level: 1,
  variableName: 1,
  // Proficiency
  value: 1,
  // Reference
  cache: 1,
  // Saving throw
  dc: 1,
}

export { LIBRARY_NODE_TREE_FIELDS };

Meteor.publish('libraryCollection', function (libraryCollectionId) {
  this.autorun(function () {
    let userId = this.userId;
    if (!userId) return [];
    this.autorun(function () {
      const libraryCollectionCursor = LibraryCollections.find({
        _id: libraryCollectionId,
        $or: [
          { owner: userId },
          { writers: userId },
          { readers: userId },
          { public: true },
        ]
      });
      const libraryCollection = libraryCollectionCursor.fetch()[0];
      if (!libraryCollection) return [libraryCollectionCursor];
      this.autorun(function () {
        const libraryCursor = Libraries.find({
          _id: { $in: libraryCollection.libraries },
          $or: [
            { owner: userId },
            { writers: userId },
            { readers: userId },
            { public: true },
          ]
        }, {
          sort: { name: 1 }
        });
        return [libraryCollectionCursor, libraryCursor];
      });
    });
  })
});

Meteor.publish('libraries', function () {
  this.autorun(function () {
    let userId = this.userId;
    if (!userId) {
      return [];
    }
    const user = Meteor.users.findOne(userId, {
      fields: { subscribedLibraries: 1, subscribedLibraryCollections: 1 }
    });

    this.autorun(function () {
      // Get the collections the user is subscribed to
      const subCollections = user && user.subscribedLibraryCollections || [];
      const libraryCollectionsCursor = LibraryCollections.find({
        $or: [
          { owner: userId },
          { writers: userId },
          { readers: userId },
          { _id: { $in: subCollections }, public: true },
        ]
      }, {
        sort: { name: 1 }
      });

      // Collate all the libraryIds in those collections
      let collectionLibIds = [];
      libraryCollectionsCursor.forEach(libCollection => {
        collectionLibIds = union(collectionLibIds, libCollection.libraries);
      });

      // Get the libraries the user is subscribed to directly
      const subs = user && user.subscribedLibraries || [];

      // Combine all the library Ids
      const libIds = union(collectionLibIds, subs);

      this.autorun(function () {
        const librariesCursor = Libraries.find({
          $or: [
            { owner: userId },
            { writers: userId },
            { readers: userId },
            { _id: { $in: libIds }, public: true },
          ]
        }, {
          sort: { name: 1 }
        });
        return [librariesCursor, libraryCollectionsCursor];
      });
    });
  });
});

Meteor.publish('library', function (libraryId) {
  if (!libraryId) return [];
  libraryIdSchema.validate({ libraryId });
  this.autorun(function () {
    let userId = this.userId;
    let library = Libraries.findOne(libraryId);
    try { assertViewPermission(library, userId) }
    catch (e) {
      return this.error(e);
    }
    return Libraries.find({
      _id: libraryId,
    });
  });
});

let libraryIdSchema = new SimpleSchema({
  libraryId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
});

Meteor.publish('libraryNodes', function (libraryId) {
  if (!libraryId) return [];
  libraryIdSchema.validate({ libraryId });
  this.autorun(function () {
    let userId = this.userId;
    let library = Libraries.findOne(libraryId);
    try { assertViewPermission(library, userId) }
    catch (e) {
      return this.error(e);
    }
    return [
      LibraryNodes.find({
        'ancestors.id': libraryId,
      }, {
        sort: { order: 1 },
        fields: LIBRARY_NODE_TREE_FIELDS,
      }),
    ];
  });
});

const nodeIdSchema = new SimpleSchema({
  libraryNodeId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
});

Meteor.publish('libraryNode', function (libraryNodeId) {
  if (!libraryNodeId) return [];
  nodeIdSchema.validate({ libraryNodeId });
  this.autorun(function () {
    const userId = this.userId;
    const nodeCursor = LibraryNodes.find({ _id: libraryNodeId });
    let node = nodeCursor.fetch()[0];
    try { assertDocViewPermission(node, userId) }
    catch (e) {
      return this.error(e);
    }
    return [nodeCursor];
  });
});

Meteor.publish('softRemovedLibraryNodes', function (libraryId) {
  if (!libraryId) return [];
  libraryIdSchema.validate({ libraryId });
  this.autorun(function () {
    let userId = this.userId;
    let library = Libraries.findOne(libraryId);
    try { assertViewPermission(library, userId) }
    catch (e) {
      return this.error(e);
    }
    return [
      LibraryNodes.find({
        'ancestors.0.id': libraryId,
        removed: true,
        removedWith: { $exists: false },
      }, {
        sort: { order: 1 },
      }),
    ];
  });
});

Meteor.publish('descendantLibraryNodes', function (nodeId) {
  let node = LibraryNodes.findOne(nodeId);
  let libraryId = node?.ancestors[0]?.id;
  if (!libraryId) return [];
  this.autorun(function () {
    let userId = this.userId;
    let library = Libraries.findOne(libraryId);
    try { assertViewPermission(library, userId) }
    catch (e) {
      return this.error(e);
    }
    return [
      LibraryNodes.find({
        'ancestors.id': nodeId,
      }, {
        sort: { order: 1 },
      }),
    ];
  });
});
