import { CloudScope, adminTenantId, defaultTenantId } from '@logto/schemas';
import { Tenants, tenantInfoGuard } from '@logto/schemas/models';
import { assert } from '@silverhand/essentials';
import { createRouter, RequestError } from '@withtyped/server';

import type { TenantsLibrary } from '#src/libraries/tenants.js';
import type { WithAuthContext } from '#src/middleware/with-auth.js';

export const tenantsRoutes = (library: TenantsLibrary) =>
  createRouter<WithAuthContext, '/tenants'>('/tenants')
    .get('/', { response: tenantInfoGuard.array() }, async (context, next) => {
      return next({
        ...context,
        json: await library.getAvailableTenants(context.auth.id),
        status: 200,
      });
    })
    .patch(
      '/:tenantId',
      {
        body: Tenants.guard('patch').pick({ name: true, tag: true }),
        response: tenantInfoGuard,
      },
      async (context, next) => {
        /** Users w/o either `ManageTenant` or `ManageTenantSelf` scope does not have permission. */
        if (
          ![CloudScope.ManageTenant, CloudScope.ManageTenantSelf].some((scope) =>
            context.auth.scopes.includes(scope)
          )
        ) {
          throw new RequestError('Forbidden due to lack of permission.', 403);
        }

        /** Should throw 404 when users with `ManageTenantSelf` scope are attempting to change an unavailable tenant. */
        if (!context.auth.scopes.includes(CloudScope.ManageTenant)) {
          const availableTenants = await library.getAvailableTenants(context.auth.id);
          assert(
            availableTenants.map(({ id }) => id).includes(context.guarded.params.tenantId),
            new RequestError(
              `Can not find tenant whose id is '${context.guarded.params.tenantId}'.`,
              404
            )
          );
        }

        return next({
          ...context,
          json: await library.updateTenantById(
            context.guarded.params.tenantId,
            context.guarded.body
          ),
          status: 200,
        });
      }
    )
    .post(
      '/',
      {
        body: Tenants.guard('create').pick({ name: true, tag: true }),
        response: tenantInfoGuard,
      },
      async (context, next) => {
        if (
          ![CloudScope.CreateTenant, CloudScope.ManageTenant].some((scope) =>
            context.auth.scopes.includes(scope)
          )
        ) {
          throw new RequestError('Forbidden due to lack of permission.', 403);
        }

        /**
         * Should throw 403 when users with `CreateTenant` scope are attempting to create more than 3 tenants.
         * This does not apply to users with `ManageTenant` scope.
         */
        if (context.auth.scopes.includes(CloudScope.CreateTenant)) {
          const availableTenants = await library.getAvailableTenants(context.auth.id);
          assert(
            availableTenants.length < 3,
            new RequestError(`Can not have more than 3 tenants.`, 403)
          );
        }

        return next({
          ...context,
          json: await library.createNewTenant(context.auth.id, context.guarded.body),
          status: 201,
        });
      }
    )
    .delete('/:tenantId', {}, async (context, next) => {
      if ([adminTenantId, defaultTenantId].includes(context.guarded.params.tenantId)) {
        throw new RequestError(`Should not delete built-in tenants.`, 422);
      }

      /** Users w/o either `ManageTenant` or `ManageTenantSelf` scope does not have permission. */
      if (
        ![CloudScope.ManageTenant, CloudScope.ManageTenantSelf].some((scope) =>
          context.auth.scopes.includes(scope)
        )
      ) {
        throw new RequestError('Forbidden due to lack of permission.', 403);
      }

      /** Should throw 404 when users with `ManageTenantSelf` scope are attempting to change an unavailable tenant. */
      if (!context.auth.scopes.includes(CloudScope.ManageTenant)) {
        const availableTenants = await library.getAvailableTenants(context.auth.id);
        assert(
          availableTenants.map(({ id }) => id).includes(context.guarded.params.tenantId),
          new RequestError(
            `Can not find tenant whose id is '${context.guarded.params.tenantId}'.`,
            404
          )
        );
      }

      await library.deleteTenantById(context.guarded.params.tenantId);
      return next({ ...context, status: 204 });
    });
