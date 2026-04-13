'use strict';

import {
    AttributeValue,
    DynamoDBClient,
    GetItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { ApiError } from './api';

export const dynamo = new DynamoDBClient({ region: 'us-east-1' });
export const directoryTable = process.env.stage + '-directories';
export const gameTable = process.env.stage + '-games';

/** The name of the Dynamo table containing users. */
export const USER_TABLE = `${process.env.stage}-users`;

/** The name of the Dynamo table containing live classes info. */
export const LIVE_CLASSES_TABLE = `${process.env.stage}-live-classes`;
/** The name of the Dynamo table containing clubs. */
export const CLUB_TABLE = `${process.env.stage}-clubs`;

type updateReturnType = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';

type AttributePathTokens = (string | number)[];
export type AttributePath = string | AttributePathTokens;

abstract class DynamoCommandBuilder {
    protected keys: Record<string, AttributeValue> = {};
    protected _table: string = '';

    /**
     * Sets the value of the given key.
     * @param key The key to set.
     * @param value The value to set for the key.
     * @returns The builder for method chaining.
     */
    key(key: string, value: string): this {
        this.keys[key] = { S: value };
        return this;
    }

    /**
     * Sets the table name for the command.
     * @param table The table name.
     * @returns The builder for method chaining.
     */
    table(table: string): this {
        this._table = table;
        return this;
    }
}

export class UpdateItemBuilder<T> extends DynamoCommandBuilder {
    private attrIndex = 0;
    private exprAttrNames: Record<string, string> = {};
    private reversedExprAttrNames: Record<string, string> = {};
    private exprAttrValues: Record<string, AttributeValue> = {};
    private setExpression = '';
    private removeExpression = '';
    private addExpression = '';

    private _condition: Condition | undefined;
    private returnValues: updateReturnType = 'NONE';

    /**
     * Clears any previously set fields on the builder.
     */
    clear() {
        this.keys = {};
        this._table = '';

        this.attrIndex = 0;
        this.exprAttrNames = {};
        this.reversedExprAttrNames = {};
        this.exprAttrValues = {};
        this.setExpression = '';
        this.removeExpression = '';

        this._condition = undefined;
        this.returnValues = 'NONE';
    }

    /**
     * Adds a command to set the given attribute to the given value.
     * If the value is undefined, this function is a no-op. If path is a string,
     * it will be split around the period character and each component will be
     * converted to a DynamoDB expression attribute name. If path is an array,
     * each item will be converted to a DynamoDB expression attribute name.
     * @param path The attribute path to set.
     * @param value The value to set.
     * @returns The UpdateItemBuilder for method chaining.
     */
    set(path: AttributePath, value: any): this {
        return this.setImpl(path, value, false);
    }

    /**
     * Adds a command to set the given attribute path to the given value
     * only if it does not already exist on the DynamoDB record. If the value
     * is undefined, this function is a no-op. If path is a string, it will be
     * split around the period character and each component will be converted
     * to a DynamoDB expression attribute name. If path is an array, each
     * item will be converted to a DynamoDB expression attribute name.
     * @param path The attribute path to set, if it does not exist.
     * @param value The value to set.
     * @returns The UpdateItemBuilder for method chaining.
     */
    setIfNotExists(path: AttributePath, value: any): this {
        return this.setImpl(path, value, true);
    }

    /**
     * Adds a command to set the given attribute path to the given value.
     * If the value is undefined, this function is a no-op. If path is a string,
     * it will be split around the period character and each component will be
     * converted to a DynamoDB expression attribute name. If path is an array, each
     * item will be converted to a DynamoDB expression attribute name.
     * @param path The attribute path to set.
     * @param value The value to set.
     * @param ifNotExists Whether to use the if_not_exists function.
     * @returns The UpdateItemBuilder for method chaining.
     */
    private setImpl(path: AttributePath, value: any, ifNotExists: boolean): this {
        if (value === undefined) {
            return this;
        }

        if (typeof path === 'string') {
            return this.setPath(path.split('.'), value, ifNotExists);
        }
        return this.setPath(path, value, ifNotExists);
    }

    /**
     * Adds a command to set the given attribute path to the given value.
     * If the value is undefined, this function is a no-op.
     * @param path The attribute path to set.
     * @param value The value to set.
     * @param ifNotExists Whether to use the if_not_exists function.
     * @returns The UpdateItemBuilder for method chaining.
     */
    private setPath(path: AttributePathTokens, value: any, ifNotExists: boolean): this {
        if (value === undefined) {
            return this;
        }

        if (this.setExpression.length > 0) {
            this.setExpression += ', ';
        }
        const expressionPath = this.addExpressionPath(path);
        this.setExpression += `${expressionPath} = ${ifNotExists ? `if_not_exists(${expressionPath}, ` : ''}:n${this.attrIndex}${ifNotExists ? ')' : ''}`;
        this.exprAttrValues[`:n${this.attrIndex}`] = marshall(value, {
            removeUndefinedValues: true,
            convertTopLevelContainer: true,
        });
        this.attrIndex++;
        return this;
    }

    /**
     * Adds a command to add the given value to the given attribute, which
     * must be a number or set. If path is a string, it will be split around
     * the period character and each component will be converted to a DynamoDB
     * expression attribute name. If path is an array, each item will be converted
     * to a DynamoDB expression attribute name.
     * @param path The attribute path to add to.
     * @param value The value to add. If undefined, this function is a no-op.
     * @returns The UpdateItemBuilder for method chaining.
     */
    add(path: AttributePath, value: any): this {
        if (value === undefined) {
            return this;
        }

        if (typeof path === 'string') {
            return this.addPath(path.split(','), value);
        }
        return this.addPath(path, value);
    }

    /**
     * Adds a command to add the given value to the given attribute path, which
     * must be a number or set.
     * @param path The attribute path to add to.
     * @param value The value to add.
     * @returns The UpdateItemBuilder for method chaining.
     */
    private addPath(path: AttributePathTokens, value: any): this {
        if (this.addExpression.length > 0) {
            this.addExpression += ', ';
        }
        this.addExpression += this.addExpressionPath(path);
        this.addExpression += ` :n${this.attrIndex}`;
        this.exprAttrValues[`:n${this.attrIndex}`] = marshall(value);
        this.attrIndex++;
        return this;
    }

    /**
     * Adds a command to append the given values to the list specified by the given attribute path.
     * If path is a string, it will be split around the period character, and each component will be
     * converted to a DynamoDB expression attribute name. If path is an array, each item will be
     * converted to a DynamoDB expression attribute name. If the path does not already exist on the
     * item, it will be set to an empty list before performing the append.
     * @param path The attribute path to set.
     * @param values The values to append to the end of the list.
     * @returns The UpdateItemBuilder for method chaining.
     */
    appendToList(path: AttributePath, values: any[]): this {
        if (this.setExpression.length > 0) {
            this.setExpression += ', ';
        }

        if (typeof path === 'string') {
            path = path.split('.');
        }

        const pathExpr = this.addExpressionPath(path);
        this.setExpression += `${pathExpr} = list_append(if_not_exists(${pathExpr}, :empty_list), :n${this.attrIndex})`;
        this.exprAttrValues[':empty_list'] = { L: [] };
        this.exprAttrValues[`:n${this.attrIndex}`] = marshall(values, {
            removeUndefinedValues: true,
            convertTopLevelContainer: true,
        });
        this.attrIndex++;
        return this;
    }

    /**
     * Adds a command to remove the given attribute path. If path is a string,
     * it will be split around the period character and each component converted
     * to a DynamoDB expression name attribute. If path is an array, each item
     * will be converted to a DynamoDB expression name attribute.
     * @param path The attribute path to remove.
     * @returns The UpdateItemBuilder for method chaining.
     */
    remove(path: AttributePath): this {
        if (typeof path === 'string') {
            return this.removePath(path.split('.'));
        }
        return this.removePath(path);
    }

    /**
     * Adds a command to remove the given attribute path.
     * @param path The attribute path to remove.
     * @returns The UpdateItemBuilder for method chaining.
     */
    private removePath(path: AttributePathTokens): this {
        if (this.removeExpression.length > 0) {
            this.removeExpression += ', ';
        }
        this.removeExpression += this.addExpressionPath(path);
        return this;
    }

    /**
     * Sets the condition expression to the given condition.
     * @param condition The condition to set.
     * @returns The UpdateItemBuilder for method chaining.
     */
    condition(condition: Condition): this {
        this._condition = condition;
        return this;
    }

    /**
     * Sets the values to return when the update item request completes.
     * @param value The value to return.
     * @returns The UpdateItemBuilder for method chaining.
     */
    return(value: updateReturnType): this {
        this.returnValues = value;
        return this;
    }

    /**
     * @returns An UpdateItemCommand with the previously set parameters.
     */
    build(): UpdateItemCommand {
        let updateExpression = '';

        if (this.setExpression.length > 0) {
            updateExpression += `SET ${this.setExpression}`;
        }
        if (this.removeExpression.length > 0) {
            updateExpression += ` REMOVE ${this.removeExpression}`;
        }
        if (this.addExpression.length > 0) {
            updateExpression += ` ADD ${this.addExpression}`;
        }

        const conditionExpr = this._condition?.build(
            this.exprAttrNames,
            this.exprAttrValues,
            this.reversedExprAttrNames,
        );
        return new UpdateItemCommand({
            Key: this.keys,
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: this.exprAttrNames,
            ExpressionAttributeValues:
                Object.entries(this.exprAttrValues).length > 0 ? this.exprAttrValues : undefined,
            ConditionExpression: conditionExpr,
            ReturnValues: this.returnValues,
            TableName: this._table,
        });
    }

    /**
     * Sends an UpdateItemCommand with the previously set parameters.
     * @returns The unmarshalled return value from the command or undefined if return values was
     * specified as NONE.
     */
    async send(): Promise<T | undefined> {
        const output = await dynamo.send(this.build());
        if (!output.Attributes) {
            return undefined;
        }
        return unmarshall(output.Attributes) as T;
    }

    /**
     * Converts the given attribute path into a DynamoDB-compliant path. Each item in the path
     * is converted into a DynamoDB expression attribute name, which is added to the exprAttrNames
     * object.
     * @param path The path to convert.
     * @returns The converted path.
     */
    private addExpressionPath(path: AttributePathTokens) {
        let result = '';

        for (const token of path) {
            if (typeof token === 'number') {
                result = result.slice(0, -1) + `[${token}].`;
            } else {
                if (this.reversedExprAttrNames[token]) {
                    result += `${this.reversedExprAttrNames[token]}.`;
                } else {
                    result += `#n${this.attrIndex}.`;
                    this.exprAttrNames[`#n${this.attrIndex}`] = token;
                    this.reversedExprAttrNames[token] = `#n${this.attrIndex}`;
                    this.attrIndex++;
                }
            }
        }

        return result.slice(0, -1);
    }
}

class Condition {
    protected attrIndex = 0;

    build(
        _exprAttrNames: Record<string, string>,
        _exprAttrValues: Record<string, AttributeValue>,
        _reversedExprAttrNames: Record<string, string>,
        _parentAttrIndex = '',
    ): string {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Temporary server error',
            privateMessage: 'Using base Condition build function',
        });
    }

    protected addExpressionPath(
        path: AttributePathTokens,
        exprAttrNames: Record<string, string>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex: string,
    ) {
        let result = '';

        for (const token of path) {
            if (typeof token === 'number') {
                result = result.slice(0, -1) + `[${token}].`;
            } else {
                if (reversedExprAttrNames[token]) {
                    result += `${reversedExprAttrNames[token]}.`;
                } else {
                    result += `#c${parentAttrIndex}${this.attrIndex}.`;
                    exprAttrNames[`#c${parentAttrIndex}${this.attrIndex}`] = token;
                    reversedExprAttrNames[token] = `#c${parentAttrIndex}${this.attrIndex}`;
                    this.attrIndex++;
                }
            }
        }

        return result.slice(0, -1);
    }
}

class AndCondition extends Condition {
    private conditions: Condition[];

    constructor(...conditions: Condition[]) {
        super();
        this.conditions = conditions;
    }

    build(
        exprAttrNames: Record<string, string>,
        exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        const result = this.conditions
            .map((condition, index) =>
                condition.build(
                    exprAttrNames,
                    exprAttrValues,
                    reversedExprAttrNames,
                    `${parentAttrIndex}${index}`,
                ),
            )
            .join(' AND ');
        return `(${result})`;
    }
}

class OrCondition extends Condition {
    private conditions: Condition[];

    constructor(...conditions: Condition[]) {
        super();
        this.conditions = conditions;
    }

    build(
        exprAttrNames: Record<string, string>,
        exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        const result = this.conditions
            .map((condition, index) =>
                condition.build(
                    exprAttrNames,
                    exprAttrValues,
                    reversedExprAttrNames,
                    `${parentAttrIndex}${index}`,
                ),
            )
            .join(' OR ');
        return `(${result})`;
    }
}

class AttributeExistsCondition extends Condition {
    private path: AttributePathTokens;

    constructor(path: AttributePath) {
        super();
        if (typeof path === 'string') {
            this.path = path.split('.');
        } else {
            this.path = path;
        }
    }

    build(
        exprAttrNames: Record<string, string>,
        _exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        return `attribute_exists (${this.addExpressionPath(this.path, exprAttrNames, reversedExprAttrNames, parentAttrIndex)})`;
    }
}

class AttributeNotExistsCondition extends Condition {
    private path: AttributePathTokens;

    constructor(path: AttributePath) {
        super();
        if (typeof path === 'string') {
            this.path = path.split('.');
        } else {
            this.path = path;
        }
    }

    build(
        exprAttrNames: Record<string, string>,
        _exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        return `attribute_not_exists (${this.addExpressionPath(this.path, exprAttrNames, reversedExprAttrNames, parentAttrIndex)})`;
    }
}

class EqualityCondition extends Condition {
    protected path: AttributePathTokens;
    protected value: any;
    protected comparator: '=' | '<>' | '<' | '<=' | '>' | '>=';

    constructor(path: AttributePath, value: any, comparator: '=' | '<>' | '<' | '<=' | '>' | '>=') {
        super();

        if (typeof path === 'string') {
            this.path = path.split('.');
        } else {
            this.path = path;
        }

        this.value = value;
        this.comparator = comparator;
    }

    build(
        exprAttrNames: Record<string, string>,
        exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        const valueName = `:c${parentAttrIndex}${this.attrIndex}`;
        this.attrIndex++;
        exprAttrValues[valueName] = marshall(this.value, { removeUndefinedValues: true });

        return `${this.addExpressionPath(this.path, exprAttrNames, reversedExprAttrNames, parentAttrIndex)} ${this.comparator} ${valueName}`;
    }
}

class SizeCondition extends EqualityCondition {
    constructor(path: AttributePath, value: any, comparator: '=' | '<>' | '<' | '<=' | '>' | '>=') {
        super(path, value, comparator);
    }

    build(
        exprAttrNames: Record<string, string>,
        exprAttrValues: Record<string, AttributeValue>,
        reversedExprAttrNames: Record<string, string>,
        parentAttrIndex = '',
    ) {
        const valueName = `:c${parentAttrIndex}${this.attrIndex}`;
        this.attrIndex++;
        exprAttrValues[valueName] = marshall(this.value, { removeUndefinedValues: true });

        return `size(${this.addExpressionPath(this.path, exprAttrNames, reversedExprAttrNames, parentAttrIndex)}) ${this.comparator} ${valueName}`;
    }
}

/**
 * Returns a condition which verifies that two or more nested conditions are
 * all true.
 * @param conditions The conditions to verify.
 */
export function and(...conditions: Condition[]): Condition {
    return new AndCondition(...conditions);
}

/**
 * Returns a condition which verifies that at least one of the nested
 * conditions is true.
 * @param conditions The conditions to verify.
 * @returns A condition that is true when any nested condition is true.
 */
export function or(...conditions: Condition[]): Condition {
    return new OrCondition(...conditions);
}

/**
 * Returns a condition which verifies that the given attribute path
 * exists on the DynamoDB item.
 * @param path The path to check.
 */
export function attributeExists(path: AttributePath): Condition {
    return new AttributeExistsCondition(path);
}

/**
 * Returns a condition which verifies that the given attribute path
 * does not exist on the DynamoDB item.
 * @param path The path to check.
 */
export function attributeNotExists(path: AttributePath): Condition {
    return new AttributeNotExistsCondition(path);
}

/**
 * Returns a condition which verifies that the given attribute path
 * equals the given value.
 * @param path The path to check.
 * @param value The value to compare against.
 */
export function equal(path: AttributePath, value: any): Condition {
    return new EqualityCondition(path, value, '=');
}

/**
 * Returns a condition which verifies that the given attribute path
 * does not equal the given value.
 * @param path The path to check.
 * @param value The value to compare against.
 */
export function notEqual(path: AttributePath, value: any): Condition {
    return new EqualityCondition(path, value, '<>');
}

/**
 * Returns a condition which verifies that the attribute at the given
 * path has a size less than the given value.
 * @param path The path to check.
 * @param value The value to compare against.
 */
export function sizeLessThan(path: AttributePath, value: number): Condition {
    return new SizeCondition(path, value, '<');
}

/**
 * Returns a condition which verifies that the given attribute path
 * is less than the given value.
 * @param path The path to check.
 * @param value The value to compare against.
 * @returns A condition that is true when the attribute is less than the value.
 */
export function lessThan(path: AttributePath, value: any): Condition {
    return new EqualityCondition(path, value, '<');
}

/** A builder for DynamoDB GetItem commands. */
export class GetItemBuilder<T> extends DynamoCommandBuilder {
    /**
     * @returns A GetItemCommand with the previously set parameters.
     */
    build(): GetItemCommand {
        if (Object.entries(this.keys).length === 0) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: `GetItemBuilder.build called with no keys`,
            });
        }
        if (!this._table) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: `GetItemBuilder.build called with no table`,
            });
        }

        return new GetItemCommand({
            Key: this.keys,
            TableName: this._table,
        });
    }

    /**
     * Sends a GetItemCommand to Dynamo with the previously set parameters.
     * @returns The item or undefined if it is not found.
     */
    async send(): Promise<T | undefined> {
        const output = await dynamo.send(this.build());
        if (!output.Item) {
            return undefined;
        }
        return unmarshall(output.Item) as T;
    }
}

/**
 * Returns the user with the given username or throws a 404 error if the user is not found.
 * @param username The username to fetch.
 * @returns The user with the given username.
 */
export async function getUser(username: string): Promise<User> {
    const user = await new GetItemBuilder<User>()
        .key('username', username)
        .table(USER_TABLE)
        .send();
    if (!user) {
        throw new ApiError({ statusCode: 404, publicMessage: `User ${username} not found` });
    }
    return user;
}
